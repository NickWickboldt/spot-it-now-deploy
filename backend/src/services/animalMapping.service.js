import { Animal } from '../models/animal.model.js';
import { AnimalMapping } from '../models/animalMapping.model.js';
import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';
import { log } from '../utils/logger.util.js';

// Normalizes AI names for storage and comparison.
// - lowercases
// - trims spaces
// - removes punctuation: -, _, ., (, )
// - collapses multiple spaces to one
const normalizeAIName = (aiName) => {
  if (typeof aiName !== 'string') return '';
  const lowered = aiName.toLowerCase();
  const noPunct = lowered.replace(/[\-_.()]/g, ' ');
  const collapsed = noPunct.replace(/\s+/g, ' ').trim();
  return collapsed;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a lenient regex for matching names, allowing flexible separators
// between tokens and safely escaping regex special characters.
const buildLenientNameRegex = (name = '') => {
  const safe = String(name ?? '');
  const tokens = safe.split(' ').filter(Boolean).map(escapeRegex);
  // Allow whitespace or common punctuation as separators (avoid \s inside character class for Mongo regex compatibility)
  const sep = '(?:\\s|[-_.()\\[\\]])*';
  const pattern = tokens.length ? `^${tokens.join(sep)}$` : `^${escapeRegex(safe)}$`;
  return new RegExp(pattern, 'i');
};

const ensureMappingForAIName = async (aiName) => {
  const normalizedName = normalizeAIName(aiName);
  if (!normalizedName) {
    return null;
  }

  const existing = await AnimalMapping.findOne({ aiName: normalizedName })
    .collation({ locale: 'en', strength: 2 });

  if (existing) {
    return existing.toObject();
  }

  const created = await AnimalMapping.findOneAndUpdate(
    { aiName: normalizedName },
    { $setOnInsert: { aiName: normalizedName, animalId: null } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).collation({ locale: 'en', strength: 2 });

  return created?.toObject?.() || created;
};

const findMappingByAIName = async (aiName) => {
  const normalized = normalizeAIName(aiName);
  if (!normalized) {
    return null;
  }

  return AnimalMapping.findOne({ aiName: normalized })
    .collation({ locale: 'en', strength: 2 })
    .lean();
};

const listUnmappedAINames = async ({ limit = 100 } = {}) => {
  const pipeline = [
    { $match: { animalId: null } },
    {
      $addFields: {
        _normalizedName: { $toLower: { $trim: { input: '$aiName' } } },
      },
    },
    {
      $lookup: {
        from: 'sightings',
        let: { normalizedName: '$_normalizedName' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$animalId', null] },
                  {
                    $eq: [
                      { $toLower: { $trim: { input: '$aiIdentification' } } },
                      '$$normalizedName',
                    ],
                  },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'usage',
      },
    },
    {
      $addFields: {
        count: { $ifNull: [{ $arrayElemAt: ['$usage.count', 0] }, 0] },
      },
    },
    { $project: { usage: 0, _normalizedName: 0, animalId: 0, createdAt: 0, updatedAt: 0 } },
    { $sort: { count: -1, aiName: 1 } },
  ];

  if (Number.isFinite(limit)) {
    pipeline.push({ $limit: limit });
  }

  const results = await AnimalMapping.aggregate(pipeline);
  return results.map(({ aiName, count }) => ({ aiName, count }));
};

const createOrUpdateMapping = async (aiName, animalId, { retroactive = true } = {}) => {
  const normalizedName = normalizeAIName(aiName);
  if (!normalizedName) {
    throw new ApiError(400, 'aiName is required');
  }

  if (!animalId) {
    throw new ApiError(400, 'animalId is required');
  }

  const animalExists = await Animal.findById(animalId).select('_id commonName').lean();
  if (!animalExists) {
    throw new ApiError(404, 'Animal not found');
  }

  const update = {
    aiName: normalizedName,
    animalId,
  };

  const mapping = await AnimalMapping.findOneAndUpdate(
    { aiName: normalizedName },
    update,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).collation({ locale: 'en', strength: 2 });

  let retroactiveStats = { matchedSightings: 0 };
  if (retroactive) {
    const { matchedSightings } = await applyMappingToSightings(normalizedName, animalId);
    retroactiveStats = { matchedSightings };
  }

  log.info('animal-mapping-service', 'Mapping saved', {
    mappingId: mapping._id,
    aiName: normalizedName,
    animalId,
    retroactive: retroactiveStats.matchedSightings,
  });

  return { mapping, retroactiveStats };
};

const applyMappingToSightings = async (aiName, animalId) => {
  const normalizedName = normalizeAIName(aiName);
  if (!normalizedName) {
    return { matchedSightings: 0 };
  }

  // Build a lenient regex that allows punctuation and spacing differences (safe against special chars)
  const regex = buildLenientNameRegex(normalizedName);

  const result = await Sighting.updateMany(
    {
      aiIdentification: { $regex: regex },
      animalId: null,
    },
    { $set: { animalId } }
  );

  return { matchedSightings: result.modifiedCount || 0 };
};

const updateMappingAnimalId = async (mappingId, { animalId, retroactive = true } = {}) => {
  if (!mappingId) {
    throw new ApiError(400, 'mappingId is required');
  }

  const mapping = await AnimalMapping.findById(mappingId);
  if (!mapping) {
    throw new ApiError(404, 'Animal mapping not found');
  }

  if (animalId) {
    const animalExists = await Animal.findById(animalId).select('_id commonName').lean();
    if (!animalExists) {
      throw new ApiError(404, 'Animal not found');
    }
    mapping.animalId = animalId;
  } else {
    mapping.animalId = null;
  }

  await mapping.save();

  let retroactiveStats = { matchedSightings: 0 };
  if (retroactive && mapping.animalId) {
    retroactiveStats = await applyMappingToSightings(mapping.aiName, mapping.animalId);
  }

  log.info('animal-mapping-service', 'Mapping updated', {
    mappingId: mapping._id,
    aiName: mapping.aiName,
    animalId: mapping.animalId,
    retroactiveMatches: retroactiveStats.matchedSightings,
  });

  return { mapping: mapping.toObject(), retroactiveStats };
};

export const animalMappingService = {
  ensureMappingForAIName,
  findMappingByAIName,
  listUnmappedAINames,
  createOrUpdateMapping,
  applyMappingToSightings,
  updateMappingAnimalId,
  // Expose normalization so other services can reuse the exact same logic
  normalizeAIName,
};
