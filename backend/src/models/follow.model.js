import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Follow model.
 * A Follow document represents one user following another user.
 */
const followSchema = new Schema(
  {
    // The user who is initiating the follow.
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The user who is being followed.
    following: {
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
 * We create a compound index to ensure that a specific user
 * cannot follow the same person more than once. This prevents
 * duplicate follow relationships.
 */
followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = mongoose.model('Follow', followSchema);