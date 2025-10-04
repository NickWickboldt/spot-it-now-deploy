import mongoose from 'mongoose';
import { Challenge } from '../models/challenge.model.js';
import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';

const toRad = (v) => (v * Math.PI) / 180;
const haversine = (lng1, lat1, lng2, lat2) => {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const createChallenge = async (data, createdBy) => {
  const { title, animals = [], tasks = [], center, radiusMeters, activeFrom, activeTo, description = '', scope = 'DAILY', targetCount } = data || {};

  // Normalize center input. Accept either GeoJSON { type:'Point', coordinates:[lng,lat] }
  // or plain objects with { lat, lng } or { latitude, longitude } (numbers or numeric strings).
  const toNum = (v) => (typeof v === 'string' ? Number(v) : v);
  let normalizedCenter = null;
  if (center && Array.isArray(center.coordinates) && center.coordinates.length === 2) {
    const lng = toNum(center.coordinates[0]);
    const lat = toNum(center.coordinates[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      normalizedCenter = { type: 'Point', coordinates: [lng, lat] };
    }
  } else if (center && (('lat' in center) || ('latitude' in center)) && (('lng' in center) || ('longitude' in center))) {
    const lat = toNum(center.lat ?? center.latitude);
    const lng = toNum(center.lng ?? center.longitude);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      normalizedCenter = { type: 'Point', coordinates: [lng, lat] };
    }
  }

  if (!normalizedCenter) {
    throw new ApiError(400, 'Missing or invalid center coordinates');
  }

  // Defaults
  const now = new Date();
  const from = activeFrom ? new Date(activeFrom) : now;
  const dayMs = 24 * 60 * 60 * 1000;
  const to = activeTo ? new Date(activeTo) : new Date(from.getTime() + dayMs);
  const fiftyMilesInMeters = Math.round(50 * 1609.34);
  const radiusNum = toNum(radiusMeters);
  const radius = Number.isFinite(radiusNum) && radiusNum > 0 ? radiusNum : fiftyMilesInMeters;
  const safeTitle = (title && String(title).trim()) || `Daily Challenge - ${from.toISOString().slice(0, 10)}`;

  // Normalize tasks if provided; filter invalid entries
  const normalizedTasks = Array.isArray(tasks)
    ? tasks
        .map((t) => ({ animal: t?.animal, required: Number(t?.required) || 1 }))
        .filter((t) => typeof t.animal === 'string' || (t.animal && t.animal._id))
    : [];

  // If tasks exist, prefer them and derive animals list from tasks
  const finalAnimals = normalizedTasks.length > 0 ? normalizedTasks.map((t) => (typeof t.animal === 'string' ? t.animal : t.animal._id)) : Array.isArray(animals) ? animals : [];

  return Challenge.create({
    title: safeTitle,
    description,
    animals: finalAnimals,
    tasks: normalizedTasks.length > 0 ? normalizedTasks : undefined,
    targetCount: typeof targetCount === 'number' && targetCount > 0 ? targetCount : (finalAnimals.length ? finalAnimals.length : undefined),
    center: normalizedCenter,
    radiusMeters: radius,
    activeFrom: from,
    activeTo: to,
    scope,
    createdBy,
  });
};

const getActiveChallengesNear = async ({ lng, lat, userId } = {}) => {
  const now = new Date();
  const challenges = await Challenge.find({ activeFrom: { $lte: now }, activeTo: { $gte: now } })
    .populate('animals', 'commonName scientificName imageUrls category')
    .populate('tasks.animal', 'commonName scientificName imageUrls category');
  // Post-filter by distance within each challenge radius
  const filtered = challenges
    .map((c) => {
      const [cLng, cLat] = c.center?.coordinates || [null, null];
      if (typeof cLng !== 'number' || typeof cLat !== 'number') return null;
      const dist = haversine(lng, lat, cLng, cLat);
      return { challenge: c, distanceMeters: dist };
    })
    .filter((x) => x && x.distanceMeters <= x.challenge.radiusMeters);

  if (!userId) return filtered;

  // For each challenge, compute per-animal progress for this user within the
  // challenge geofence and active time window.
  const results = [];
  for (const entry of filtered) {
    const { challenge } = entry;
    const [cLng, cLat] = challenge.center.coordinates || [null, null];
    if (typeof cLng !== 'number' || typeof cLat !== 'number') {
      results.push({ ...entry, progressByAnimalId: {} });
      continue;
    }

    // Determine the set of animalIds to track progress for.
    const taskAnimals = Array.isArray(challenge.tasks) && challenge.tasks.length > 0
      ? challenge.tasks.map((t) => (typeof t.animal === 'object' && t.animal?._id ? String(t.animal._id) : String(t.animal)))
      : (Array.isArray(challenge.animals) ? challenge.animals.map((a) => (typeof a === 'object' && a?._id ? String(a._id) : String(a))) : []);

    if (!taskAnimals.length) {
      results.push({ ...entry, progressByAnimalId: {} });
      continue;
    }

    const radiusRad = (challenge.radiusMeters || 0) / 6371000; // meters to radians
    const pipeline = [
      {
        $match: {
          user: typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId,
          animalId: { $in: taskAnimals.map((id) => new mongoose.Types.ObjectId(id)) },
          createdAt: { $gte: challenge.activeFrom, $lte: challenge.activeTo },
          location: { $geoWithin: { $centerSphere: [[cLng, cLat], radiusRad] } },
        },
      },
      { $group: { _id: '$animalId', count: { $sum: 1 } } },
    ];

    let counts = [];
    try {
      counts = await Sighting.aggregate(pipeline);
    } catch (_) {
      counts = [];
    }

    const progressByAnimalId = {};
    for (const doc of counts) {
      progressByAnimalId[String(doc._id)] = doc.count || 0;
    }

    // Ensure zero entries exist for tracked animals
    for (const id of taskAnimals) {
      if (!Object.prototype.hasOwnProperty.call(progressByAnimalId, id)) {
        progressByAnimalId[id] = 0;
      }
    }

    results.push({ ...entry, progressByAnimalId });
  }

  return results;
};

export const challengeService = {
  createChallenge,
  getActiveChallengesNear,
  listAll: async () =>
    Challenge.find()
      .sort({ createdAt: -1 })
      .populate('animals', 'commonName scientificName imageUrls category')
      .populate('tasks.animal', 'commonName scientificName imageUrls category'),
};
