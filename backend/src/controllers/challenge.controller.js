import { challengeService } from '../services/challenge.service.js';
import { ApiError } from '../utils/ApiError.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

export const createChallenge = asyncHandler(async (req, res) => {
  const created = await challengeService.createChallenge(req.body, req.user?._id);
  return res.status(201).json(new ApiResponse(201, created, 'Challenge created'));
});

export const getTodayChallenges = asyncHandler(async (req, res) => {
  // Prefer explicit lat/lng in query, else try user profile location
  let { lat, lng } = req.query;
  if ((lat == null || lng == null) && req.user) {
    lat = req.user.latitude;
    lng = req.user.longitude;
  }
  if (lat == null || lng == null) {
    throw new ApiError(400, 'Missing lat/lng, and user has no saved location');
  }
  const result = await challengeService.getActiveChallengesNear({ lng: Number(lng), lat: Number(lat), userId: req.user?._id });
  // Normalize response
  const data = result.map(({ challenge, distanceMeters, progressByAnimalId }) => ({
    _id: challenge._id,
    title: challenge.title,
    description: challenge.description,
    animals: challenge.animals,
    tasks: challenge.tasks?.map((t) => ({
      animal: t.animal, // populated
      required: t.required,
      completed: progressByAnimalId ? (progressByAnimalId[String(t.animal?._id || t.animal)] || 0) : 0,
    })),
    targetCount: challenge.targetCount,
    activeFrom: challenge.activeFrom,
    activeTo: challenge.activeTo,
    radiusMeters: challenge.radiusMeters,
    center: challenge.center,
    distanceMeters,
  }));
  return res.status(200).json(new ApiResponse(200, data, 'Active challenges'));
});

export const adminListChallenges = asyncHandler(async (_req, res) => {
  const docs = await challengeService.listAll();
  const data = docs.map((c) => ({
    _id: c._id,
    title: c.title,
    description: c.description,
    animals: c.animals,
    tasks: c.tasks?.map((t) => ({ animal: t.animal, required: t.required })),
    targetCount: c.targetCount,
    activeFrom: c.activeFrom,
    activeTo: c.activeTo,
    radiusMeters: c.radiusMeters,
    center: c.center,
    scope: c.scope,
    createdAt: c.createdAt,
  }));
  return res.status(200).json(new ApiResponse(200, data, 'All challenges'));
});
