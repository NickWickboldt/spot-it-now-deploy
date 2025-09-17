import { Animal } from '../models/animal.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Creates a new animal in the database.
 * @param {object} animalData - The data for the new animal.
 * @returns {Promise<Animal>} The created animal object.
 */
const createAnimal = async (animalData) => {
  const { scientificName } = animalData;

  // Check if an animal with the same scientific name already exists
  const existingAnimal = await Animal.findOne({ scientificName });
  if (existingAnimal) {
    throw new ApiError(409, 'An animal with this scientific name already exists.');
  }

  return await Animal.create(animalData);
};

/**
 * Updates an animal's details.
 * @param {string} animalId - The ID of the animal to update.
 * @param {object} updateData - An object with the fields to update.
 * @returns {Promise<Animal>} The updated animal object.
 */
const updateAnimal = async (animalId, updateData) => {
  const animal = await Animal.findByIdAndUpdate(animalId, { $set: updateData }, { new: true });
  if (!animal) {
    throw new ApiError(404, 'Animal not found');
  }
  return animal;
};

/**
 * Deletes an animal from the database.
 * @param {string} animalId - The ID of the animal to delete.
 */
const deleteAnimal = async (animalId) => {
  const animal = await Animal.findByIdAndDelete(animalId);
  if (!animal) {
    throw new ApiError(404, 'Animal not found');
  }
};

/**
 * Gets a single animal by its ID.
 * @param {string} animalId - The ID of the animal.
 * @returns {Promise<Animal>} The animal object.
 */
const getAnimalById = async (animalId) => {
  const animal = await Animal.findById(animalId);
  if (!animal) {
    throw new ApiError(404, 'Animal not found');
  }
  return animal;
};

/**
 * Gets all animals from the database.
 * @param {object} query - Optional query filter object
 * @returns {Promise<Animal[]>} An array of animal objects.
 */
const getAllAnimals = async (query = {}) => {
  return await Animal.find(query);
};

/**
 * Gets a single field from an animal's document.
 * @param {string} animalId - The ID of the animal.
 * @param {string} fieldName - The name of the field to retrieve.
 * @returns {Promise<any>} The value of the requested field.
 */
const getAnimalField = async (animalId, fieldName) => {
  const animal = await Animal.findById(animalId).select(fieldName);
  if (!animal) {
    throw new ApiError(404, "Animal not found");
  }
  return animal[fieldName];
};

/**
 * Updates one or more specific fields for an animal.
 * @param {string} animalId - The ID of the animal to update.
 * @param {object} fieldsToUpdate - An object with the key-value pairs to update.
 * @returns {Promise<Animal>} The updated animal object.
 */
const updateAnimalField = async (animalId, fieldsToUpdate) => {
  const animal = await Animal.findByIdAndUpdate(
    animalId,
    { $set: fieldsToUpdate },
    { new: true }
  );
  if (!animal) {
    throw new ApiError(404, "Animal not found");
  }
  return animal;
};

/**
 * Adds a new image URL to an animal's imageUrls array.
 * @param {string} animalId - The ID of the animal.
 * @param {string} imageUrl - The new image URL to add.
 * @returns {Promise<Animal>} The updated animal object.
 */
const addImageUrlToAnimal = async (animalId, imageUrl) => {
  const animal = await Animal.findByIdAndUpdate(
    animalId,
    { $push: { imageUrls: imageUrl } },
    { new: true }
  );
  if (!animal) {
    throw new ApiError(404, 'Animal not found');
  }
  return animal;
};

/**
 * Removes an image URL from an animal's imageUrls array.
 * @param {string} animalId - The ID of the animal.
 * @param {string} imageUrl - The image URL to remove.
 * @returns {Promise<Animal>} The updated animal object.
 */
const removeImageUrlFromAnimal = async (animalId, imageUrl) => {
  const animal = await Animal.findByIdAndUpdate(
    animalId,
    { $pull: { imageUrls: imageUrl } },
    { new: true }
  );
  if (!animal) {
    throw new ApiError(404, 'Animal not found');
  }
  return animal;
};

/**
 * Finds an animal by common name (case-insensitive).
 * @param {string} commonName - The common name to search for.
 * @returns {Promise<Animal|null>} The matching animal or null if not found.
 */
const findAnimalByCommonName = async (commonName) => {
  if (!commonName || typeof commonName !== 'string') {
    return null;
  }
  
  // Try exact match first (case-insensitive)
  const exactMatch = await Animal.findOne({ 
    commonName: { $regex: new RegExp(`^${commonName.trim()}$`, 'i') }
  });
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Try partial match if exact match fails
  const partialMatch = await Animal.findOne({
    commonName: { $regex: new RegExp(commonName.trim(), 'i') }
  });
  
  return partialMatch;
};

/**
 * Finds an animal by scientific name (case-insensitive).
 * @param {string} scientificName - The scientific name to search for.
 * @returns {Promise<Animal|null>} The matching animal or null if not found.
 */
const findAnimalByScientificName = async (scientificName) => {
  if (!scientificName || typeof scientificName !== 'string') {
    return null;
  }
  
  // Clean up scientific name (remove parentheses if present)
  const cleanName = scientificName.replace(/[()]/g, '').trim();
  
  const animal = await Animal.findOne({ 
    scientificName: { $regex: new RegExp(`^${cleanName}$`, 'i') }
  });
  
  return animal;
};

/**
 * Finds an animal by either common name or scientific name.
 * @param {object} identification - Object containing commonName and/or scientificName
 * @returns {Promise<Animal|null>} The matching animal or null if not found.
 */
const findAnimalByIdentification = async (identification) => {
  if (!identification || typeof identification !== 'object') {
    return null;
  }
  
  const { commonName, scientificName } = identification;
  
  // Try common name first
  if (commonName) {
    const byCommonName = await findAnimalByCommonName(commonName);
    if (byCommonName) {
      return byCommonName;
    }
  }
  
  // Try scientific name if common name doesn't work
  if (scientificName) {
    const byScientificName = await findAnimalByScientificName(scientificName);
    if (byScientificName) {
      return byScientificName;
    }
  }
  
  return null;
};

export const animalService = {
  createAnimal,
  updateAnimal,
  deleteAnimal,
  getAnimalById,
  getAllAnimals,
  getAnimalField,
  updateAnimalField,
  addImageUrlToAnimal,
  removeImageUrlFromAnimal,
  findAnimalByCommonName,
  findAnimalByScientificName,
  findAnimalByIdentification,
};