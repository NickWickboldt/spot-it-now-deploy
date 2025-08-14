import { Animal } from '../models/animal.model.js';
import { ApiError } from '../utils/ApiError.js';

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
 * @returns {Promise<Animal[]>} An array of animal objects.
 */
const getAllAnimals = async () => {
  return await Animal.find({});
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
};