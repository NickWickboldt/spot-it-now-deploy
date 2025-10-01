import mongoose, { Schema } from 'mongoose';

/**
 * Maps raw AI identification strings to canonical AnimalDex entries.
 * Allows the system to link AI outputs to known animals retroactively.
 */
const animalMappingSchema = new Schema(
  {
    aiName: {
      type: String,
      required: true,
      trim: true,
    },
    animalId: {
      type: Schema.Types.ObjectId,
      ref: 'Animal',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Case-insensitive search support for AI names.
animalMappingSchema.index({ aiName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const AnimalMapping = mongoose.model('AnimalMapping', animalMappingSchema);
