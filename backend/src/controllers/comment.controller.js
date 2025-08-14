import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { commentService } from '../services/comment.service.js';

/**
 * Controller to create a new comment on a sighting.
 */
const createComment = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const { commentText } = req.body;
  const userId = req.user._id; // From verifyJWT middleware

  const newComment = await commentService.createComment(sightingId, userId, commentText);
  return res
    .status(201)
    .json(new ApiResponse(201, newComment, 'Comment posted successfully'));
});

/**
 * Controller to update an existing comment.
 */
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { commentText } = req.body;
  const userId = req.user._id;

  const updatedComment = await commentService.updateComment(commentId, userId, commentText);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, 'Comment updated successfully'));
});

/**
 * Controller to delete a comment.
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;
  const isAdmin = req.admin ? true : false; // Check if user is an admin

  await commentService.deleteComment(commentId, userId, isAdmin);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Comment deleted successfully'));
});

/**
 * Controller to get all comments for a specific sighting.
 */
const getCommentsForSighting = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const comments = await commentService.getCommentsForSighting(sightingId);
  return res
    .status(200)
    .json(new ApiResponse(200, comments, 'Sighting comments fetched successfully'));
});

export {
  createComment,
  updateComment,
  deleteComment,
  getCommentsForSighting,
};
