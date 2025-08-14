import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Achievement model.
 * This stores the master list of all possible achievements in the application.
 */
const achievementSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    iconUrl: {
      type: String,
      required: true,
    },
    pointsReward: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Achievement = mongoose.model('Achievement', achievementSchema);