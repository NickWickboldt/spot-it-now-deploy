import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Comment model.
 * A Comment document represents a single user comment on a single sighting.
 */
const commentSchema = new Schema(
  {
    // The sighting that was commented on.
    sighting: {
      type: Schema.Types.ObjectId,
      ref: 'Sighting',
      required: true,
      index: true, // Index this field for faster lookups of comments for a sighting
    },
    // The user who wrote the comment.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The content of the comment.
    commentText: {
      type: String,
      required: true,
      trim: true,
    },
  },
  // The `timestamps` option automatically adds `createdAt` and `updatedAt` fields.
  {
    timestamps: true,
  }
);

export const Comment = mongoose.model('Comment', commentSchema);