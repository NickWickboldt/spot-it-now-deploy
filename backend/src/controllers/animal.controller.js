
import { animalService } from '../services/animal.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { log } from '../utils/logger.util.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- General Animal CRUD ---

const createAnimal = asyncHandler(async (req, res) => {
  const newAnimal = await animalService.createAnimal(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, newAnimal, 'Animal created successfully'));
});

const updateAnimal = asyncHandler(async (req, res) => {
  const { animalId } = req.params;
  const updatedAnimal = await animalService.updateAnimal(animalId, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedAnimal, 'Animal updated successfully'));
});

const deleteAnimal = asyncHandler(async (req, res) => {
  const { animalId } = req.params;
  await animalService.deleteAnimal(animalId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Animal deleted successfully'));
});

const getAnimalById = asyncHandler(async (req, res) => {
  const { animalId } = req.params;
  const animal = await animalService.getAnimalById(animalId);
  return res
    .status(200)
    .json(new ApiResponse(200, animal, 'Animal fetched successfully'));
});

const getAllAnimals = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  
  let query = {};
  
  // Add category filter if provided
  if (category) {
    query.category = category;
  }
  
  // Add search filter if provided
  if (search) {
    query.commonName = { $regex: search, $options: 'i' }; // Case-insensitive search
  }
  
  const animals = await animalService.getAllAnimals(query);
  return res
    .status(200)
    .json(new ApiResponse(200, animals, 'Animals fetched successfully'));
});

// --- Individual Field Getters ---

const getAnimalField = asyncHandler(async (req, res) => {
    const { animalId, fieldName } = req.params;
    const fieldValue = await animalService.getAnimalField(animalId, fieldName);
    return res.status(200).json(new ApiResponse(200, { [fieldName]: fieldValue }, `${fieldName} fetched successfully`));
});

// --- Individual Field Setters ---

const setAnimalField = asyncHandler(async (req, res) => {
    const { animalId, fieldName } = req.params;
    const updatedAnimal = await animalService.updateAnimalField(animalId, req.body);
    return res.status(200).json(new ApiResponse(200, updatedAnimal, `${fieldName} updated successfully`));
});


// --- Array Field Modifiers ---

const addImageUrl = asyncHandler(async (req, res) => {
  const { animalId } = req.params;
  const { imageUrl } = req.body;
  const updatedAnimal = await animalService.addImageUrlToAnimal(animalId, imageUrl);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedAnimal, 'Image URL added successfully'));
});

const removeImageUrl = asyncHandler(async (req, res) => {
  const { animalId } = req.params;
  const { imageUrl } = req.body;
  const updatedAnimal = await animalService.removeImageUrlFromAnimal(animalId, imageUrl);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedAnimal, 'Image URL removed successfully'));
});

/**
 * Controller to find/match an animal by identification data.
 */
const findAnimalByIdentification = asyncHandler(async (req, res) => {
  const { commonName, scientificName } = req.body;
  const identification = { commonName, scientificName };
  const matchedAnimal = await animalService.findAnimalByIdentification(identification);
  
  if (matchedAnimal) {
    return res
      .status(200)
      .json(new ApiResponse(200, matchedAnimal, 'Animal found successfully'));
  } else {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'No matching animal found'));
  }
});

export {
  addImageUrl, createAnimal, deleteAnimal, findAnimalByIdentification, getAllAnimals, getAnimalById, getAnimalField, removeImageUrl, setAnimalField, updateAnimal
};

// --- AI Suggestion Endpoint ---

const API_KEY = "AIzaSyCZOLCu2c-fTsGqN2oy2Gl_hSPaFTq2V30";

export const suggestAnimalData = asyncHandler(async (req, res) => {
  const { commonName } = req.body || {};
  if (!commonName || typeof commonName !== 'string') {
    return res.status(400).json(new ApiResponse(400, null, 'commonName is required'));
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are helping fill an Animal database. Return ONLY valid JSON. For the given common name, produce the following fields:
{
  "scientificName": string,
  "description": string,
  "category": one of ["Mammals", "Birds", "Insects and Arachnids", "Reptiles and Amphibians", "Marine Animals"],
  "rarityLevel": one of ["Common", "Uncommon", "Rare", "Legendary"],
  "conservationStatus": string (e.g., "Least Concern", "Vulnerable", or "Not Evaluated")
}
Guidelines:
- Keep description concise (2-3 sentences max), factual, and family-friendly.
- If unsure, use conservationStatus: "Not Evaluated".
- Pick category from the allowed list only.

Common name: ${commonName}
Output strictly JSON with the exact keys above.`;

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || '';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // try to extract JSON block
      const match = text.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : null;
    }

    if (!data || typeof data !== 'object') {
      throw new Error('AI did not return valid JSON');
    }

    // Coerce fields and enforce enumerations
    const allowedCategories = ["Mammals", "Birds", "Insects and Arachnids", "Reptiles and Amphibians", "Marine Animals"];
    const allowedRarity = ["Common", "Uncommon", "Rare", "Legendary"];

    const payload = {
      commonName: commonName.trim(),
      scientificName: String(data.scientificName || '').trim() || `Unknown_${Date.now()}_${commonName.replace(/\s+/g, '_')}`,
      description: String(data.description || '').trim() || `No description available for ${commonName}.`,
      category: allowedCategories.includes(data.category) ? data.category : 'Mammals',
      rarityLevel: allowedRarity.includes(data.rarityLevel) ? data.rarityLevel : 'Common',
      conservationStatus: String(data.conservationStatus || 'Not Evaluated').trim(),
    };

    log.info('animal-controller', 'AI suggestion generated', { commonName, category: payload.category, rarityLevel: payload.rarityLevel });
    return res.status(200).json(new ApiResponse(200, payload, 'Suggestion generated'));
  } catch (error) {
    log.warn('animal-controller', 'AI suggestion failed', { error: error?.message || error });
    return res.status(500).json(new ApiResponse(500, null, 'Failed to generate suggestion'));
  }
});

