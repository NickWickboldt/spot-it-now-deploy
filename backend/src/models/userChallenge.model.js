import mongoose, { Schema } from 'mongoose';

/**
 * Schema for user-specific challenges.
 * 
 * This stores the PERSISTED daily and weekly challenges for each user.
 * Challenges are generated once and stored until they expire.
 */
const userChallengeSchema = new Schema(
  {
    // Reference to the user
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Reference to the regional challenge (for the probability manifest)
    region_id: {
      type: Schema.Types.ObjectId,
      ref: 'RegionalChallenge',
      required: true,
    },
    // Region key for easy lookup
    region_key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // Human-readable location
    location: {
      type: String,
      required: true,
      trim: true,
    },
    // Daily challenge - expires after 24 hours
    daily: {
      animals: [
        {
          name: { type: String, required: true },
          probability: { type: Number, required: true },
          count: { type: Number, required: true, default: 1 },
          progress: { type: Number, default: 0 }, // How many spotted so far
        },
      ],
      expires_at: { type: Date, required: true },
      completed: { type: Boolean, default: false },
      completed_at: { type: Date },
      xp_potential: { type: Number, default: 0 }, // XP that will be earned on completion
      xp_awarded: { type: Number, default: 0 }, // XP actually awarded on completion
    },
    // Weekly challenge - expires after 7 days
    weekly: {
      animals: [
        {
          name: { type: String, required: true },
          probability: { type: Number, required: true },
          count: { type: Number, required: true, default: 1 },
          progress: { type: Number, default: 0 }, // How many spotted so far
        },
      ],
      expires_at: { type: Date, required: true },
      completed: { type: Boolean, default: false },
      completed_at: { type: Date },
      xp_potential: { type: Number, default: 0 }, // XP that will be earned on completion
      xp_awarded: { type: Number, default: 0 }, // XP actually awarded on completion
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
userChallengeSchema.index({ user_id: 1, region_key: 1 });

// Index for finding expired challenges
userChallengeSchema.index({ 'daily.expires_at': 1 });
userChallengeSchema.index({ 'weekly.expires_at': 1 });

export const UserChallenge = mongoose.model('UserChallenge', userChallengeSchema);
