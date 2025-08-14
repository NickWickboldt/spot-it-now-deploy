import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the UserAchievement model.
 * This model represents a single user earning a single achievement,
 * creating a many-to-many relationship between Users and Achievements.
 */
const userAchievementSchema = new Schema(
  {
    // The user who earned the achievement.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The achievement that was earned.
    achievement: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
    },
  },
  // The `timestamps` option automatically adds a `createdAt` field,
  // which serves as the 'earned_at' timestamp.
  {
    timestamps: true,
  }
);

/**
 * A compound unique index is created to ensure that a user
 * cannot earn the exact same achievement more than once.
 */
userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

export const UserAchievement = mongoose.model(
  'UserAchievement',
  userAchievementSchema
);
