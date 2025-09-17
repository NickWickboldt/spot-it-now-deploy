import { animalService } from '../services/animal.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

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

