import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Achievement model.
 * This stores the master list of all possible achievements/badges in the application.
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
    // XP awarded when this badge is earned
    xpReward: {
      type: Number,
      required: true,
      default: 0,
    },
    // Legacy field for backwards compatibility
    pointsReward: {
      type: Number,
      default: 0,
    },
    // Category of the badge for grouping in UI
    category: {
      type: String,
      enum: ['category_mastery', 'rarity_hunting', 'milestones', 'special', 'social', 'challenges'],
      default: 'special',
    },
    // Tier level for badges with multiple levels
    tier: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    // Threshold value needed to earn this badge (e.g., number of sightings)
    threshold: {
      type: Number,
      default: 1,
    },
    // Type of tracking for automatic badge awarding
    trackingType: {
      type: String,
      enum: [
        'total_sightings',
        'category_sightings',
        'rarity_sightings', 
        'unique_animals',
        'streak_days',
        'challenges_completed',
        'social_actions',
        'special',
      ],
      default: 'special',
    },
    // For category/rarity specific badges
    trackingValue: {
      type: String,
      trim: true,
    },
    // Whether this badge is hidden until earned
    isSecret: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookups by tracking type
achievementSchema.index({ trackingType: 1, trackingValue: 1 });
achievementSchema.index({ category: 1, tier: 1 });

export const Achievement = mongoose.model('Achievement', achievementSchema);