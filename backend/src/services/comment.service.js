import { Comment } from '../models/comment.model.js';
import { Sighting } from '../models/sighting.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Creates a new comment on a sighting.
 * @param {string} sightingId - The ID of the sighting being commented on.
 * @param {string} userId - The ID of the user creating the comment.
 * @param {string} commentText - The content of the comment.
 * @returns {Promise<Comment>} The created comment object.
 */
const createComment = async (sightingId, userId, commentText) => {
  if (!commentText?.trim()) {
    throw new ApiError(400, 'Comment text cannot be empty.');
  }

  // Verify the sighting exists before allowing a comment
  const sighting = await Sighting.findById(sightingId);
  if (!sighting) {
    throw new ApiError(404, 'Sighting not found.');
  }

  const comment = await Comment.create({
    sighting: sightingId,
    user: userId,
    commentText,
  });

  // increment denormalized comments counter on the sighting
  try {
    await Sighting.findByIdAndUpdate(sightingId, { $inc: { comments: 1 } });
  } catch {}

  return comment;
};

/**
 * Updates the text of an existing comment.
 * @param {string} commentId - The ID of the comment to update.
 * @param {string} userId - The ID of the user attempting the update.
 * @param {string} newCommentText - The new content for the comment.
 * @returns {Promise<Comment>} The updated comment object.
 */
const updateComment = async (commentId, userId, newCommentText) => {
  if (!newCommentText?.trim()) {
    throw new ApiError(400, 'Comment text cannot be empty.');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found.');
  }

  // Check if the user is the owner of the comment
  if (comment.user.toString() !== String(userId)) {
    throw new ApiError(403, 'You are not authorized to edit this comment.');
  }

  comment.commentText = newCommentText;
  await comment.save();

  return comment;
};

/**
 * Deletes a comment.
 * @param {string} commentId - The ID of the comment to delete.
 * @param {string} userId - The ID of the user attempting the deletion.
 * @param {boolean} isAdmin - Flag indicating if the user is an admin.
 */
const deleteComment = async (commentId, userId, isAdmin = false) => {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found.');
  }

  // Allow deletion only if the user is the owner or an admin
  if (comment.user.toString() !== String(userId) && !isAdmin) {
    throw new ApiError(403, 'You are not authorized to delete this comment.');
  }

  await Comment.findByIdAndDelete(commentId);
  // decrement denormalized comments counter on the sighting
  try {
    await Sighting.findByIdAndUpdate(comment.sighting, { $inc: { comments: -1 } });
  } catch {}
};

/**
 * Gets all comments for a specific sighting.
 * @param {string} sightingId - The ID of the sighting.
 * @returns {Promise<Comment[]>} An array of comment objects, populated with user details.
 */
const getCommentsForSighting = async (sightingId) => {
  return await Comment.find({ sighting: sightingId })
    .populate('user', 'username profilePictureUrl')
    .sort({ createdAt: 'asc' }); // Sort by oldest first
};


export const commentService = {
  createComment,
  updateComment,
  deleteComment,
  getCommentsForSighting,
};
