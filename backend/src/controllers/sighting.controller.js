import { sightingService } from '../services/sighting.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { log } from '../utils/logger.util.js';

/**
 * Controller to create a new sighting post.
 */
const createSighting = asyncHandler(async (req, res) => {
  // The user's ID is attached to the request by the verifyJWT middleware
  const userId = req.user._id;
  log.route('sighting-controller', 'Create sighting request', { userId, bodyKeys: Object.keys(req.body || {}) }, userId);
  const newSighting = await sightingService.createSighting(userId, req.user.username, req.body, );
  log.info('sighting-controller', 'Create sighting success', { sightingId: newSighting._id }, userId);
  return res
    .status(201)
    .json(new ApiResponse(201, newSighting, 'Sighting created successfully'));
});

/**
 * Controller to delete a sighting.
 */
const deleteSighting = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const userId = req.user._id;
  // Check if the user is an admin (middleware would have attached this)
  const isAdmin = req.admin ? true : false; 
  await sightingService.deleteSighting(sightingId, userId, isAdmin);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Sighting deleted successfully'));
});

/**
 * Controller to get a single sighting by its ID.
 */
const getSightingById = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const sighting = await sightingService.getSightingById(sightingId);
  return res
    .status(200)
    .json(new ApiResponse(200, sighting, 'Sighting fetched successfully'));
});

/**
 * Controller to get public sightings for a specific user (excludes private).
 */
const getSightingsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const sightings = await sightingService.getSightingsByUser(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, sightings, 'User public sightings fetched successfully'));
});

/**
 * Secured controller to get the current user's own sightings, including private.
 */
const getMySightings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sightings = await sightingService.getSightingsByUserAll(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, sightings, 'My sightings fetched successfully'));
});

/**
 * Controller to get all sightings of a specific animal.
 */
const getSightingsByAnimal = asyncHandler(async (req, res) => {
    const { animalId } = req.params;
    const sightings = await sightingService.getSightingsByAnimal(animalId);
    return res
        .status(200)
        .json(new ApiResponse(200, sightings, 'Animal sightings fetched successfully'));
});

/**
 * Controller to find sightings near a specific geographic point.
 */
const findSightingsNear = asyncHandler(async (req, res) => {
    // Data comes from query parameters, e.g., /api/v1/sightings/near?long=-96.8&lat=32.7&dist=5000
    const { long, lat, dist } = req.query;
    const sightings = await sightingService.findSightingsNear(parseFloat(long), parseFloat(lat), parseInt(dist));
    return res
        .status(200)
        .json(new ApiResponse(200, sightings, 'Nearby sightings fetched successfully'));
});

/**
 * Public controller to fetch recent sightings (paginated) for the feed.
 * Query params: page, pageSize
 */
const getRecentSightings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const result = await sightingService.getRecentSightingsPage({ page, pageSize });
  return res.status(200).json(new ApiResponse(200, result, 'Recent sightings page fetched successfully'));
});

/**
 * Secured controller to fetch recent sightings from users the current user follows.
 * Query params: page, pageSize
 */
const getFollowingRecentSightings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const userId = req.user._id;
  const result = await sightingService.getFollowingRecentSightingsPage({ userId, page, pageSize });
  return res.status(200).json(new ApiResponse(200, result, 'Following sightings page fetched successfully'));
});

/**
 * Admin controller to fetch paginated sightings with optional search.
 * Query params: page, pageSize, q
 */
const getAllSightings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const q = req.query.q || '';
  const result = await sightingService.getSightingsPage({ page, pageSize, q });
  return res.status(200).json(new ApiResponse(200, result, 'Sightings page fetched successfully'));
});

/**
 * Controller to update a specific field in a sighting.
 */
const updateSightingField = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const updatedSighting = await sightingService.updateSightingField(sightingId, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedSighting, 'Sighting updated successfully'));
});

/**
 * Controller to add a media URL to a sighting.
 */
const addMediaUrlToSighting = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const { mediaUrl } = req.body;
  const updatedSighting = await sightingService.addMediaUrlToSighting(sightingId, mediaUrl);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedSighting, 'Media URL added successfully'));
});

/**
 * Controller to remove a media URL from a sighting.
 */
const removeMediaUrlFromSighting = asyncHandler(async (req, res) => {
  const { sightingId } = req.params;
  const { mediaUrl } = req.body;
  const updatedSighting = await sightingService.removeMediaUrlFromSighting(sightingId, mediaUrl);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedSighting, 'Media URL removed successfully'));
});

export {
  addMediaUrlToSighting, createSighting,
  deleteSighting, findSightingsNear,
  // admin
  getAllSightings, getRecentSightings, getFollowingRecentSightings, getSightingById, getSightingsByAnimal, getSightingsByUser, getMySightings, removeMediaUrlFromSighting, updateSightingField
};

