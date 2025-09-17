import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Animal model.
 * This stores all the static information about a particular animal species.
 */
const animalSchema = new Schema(
  {
    commonName: {
      type: String,
      required: true,
      trim: true,
    },
    scientificName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true, // Index for faster searching
    },
    description: {
      type: String,
      required: true,
    },
    // Storing an array of strings for multiple image URLs
    imageUrls: [
      {
        type: String,
      },
    ],
    rarityLevel: {
      type: String,
      required: true,
      enum: ['Common', 'Uncommon', 'Rare', 'Legendary'], // Enforce specific values
    },
    category: {
      type: String,
      required: true,
      enum: ['Mammals', 'Birds', 'Insects and Arachnids', 'Reptiles and Amphibians', 'Marine Animals'],
      index: true, // Index for faster filtering by category
    },
    conservationStatus: {
      type: String,
      default: 'Not Evaluated',
    },
    // Taxonomic classification fields
    kingdom: {
      type: String,
      trim: true,
    },
    phylum: {
      type: String,
      trim: true,
    },
    class: {
      type: String,
      trim: true,
    },
    order: {
      type: String,
      trim: true,
    },
    family: {
      type: String,
      trim: true,
    },
    genus: {
      type: String,
      trim: true,
    },
    species: {
      type: String,
      trim: true,
    },
  },
  // The `timestamps` option automatically adds `createdAt` and `updatedAt` fields
  {
    timestamps: true,
  }
);

export const Animal = mongoose.model('Animal', animalSchema);