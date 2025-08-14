import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Like model.
 * A Like document represents a single user liking a single sighting.
 */
const likeSchema = new Schema(
  {
    // The sighting that was liked.
    sighting: {
      type: Schema.Types.ObjectId,
      ref: 'Sighting',
      required: true,
    },
    // The user who gave the like.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  // The `timestamps` option automatically adds a `createdAt` field.
  {
    timestamps: true,
  }
);

/**
 * To prevent a user from liking the same post multiple times,
 * we can create a compound index that ensures the combination of
 * sighting and user is unique.
 */
likeSchema.index({ sighting: 1, user: 1 }, { unique: true });

export const Like = mongoose.model('Like', likeSchema);
