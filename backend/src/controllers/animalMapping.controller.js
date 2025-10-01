import { animalMappingService } from '../services/animalMapping.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

const getUnmappedAINames = asyncHandler(async (req, res) => {
  const parsedLimit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
  const entries = await animalMappingService.listUnmappedAINames({ limit });
  return res
    .status(200)
    .json(new ApiResponse(200, entries, 'Unmapped AI identifications retrieved successfully'));
});

const createAnimalMapping = asyncHandler(async (req, res) => {
  const { aiName, animalId, retroactive } = req.body || {};
  const shouldRunRetroactive = typeof retroactive === 'boolean' ? retroactive : true;
  const result = await animalMappingService.createOrUpdateMapping(aiName, animalId, { retroactive: shouldRunRetroactive });
  return res
    .status(201)
    .json(new ApiResponse(201, result, 'Animal mapping saved successfully'));
});

const updateAnimalMapping = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { animalId, retroactive } = req.body || {};
  const shouldRunRetroactive = typeof retroactive === 'boolean' ? retroactive : true;
  const result = await animalMappingService.updateMappingAnimalId(id, { animalId, retroactive: shouldRunRetroactive });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Animal mapping updated successfully'));
});

export {
    createAnimalMapping, getUnmappedAINames, updateAnimalMapping
};

