import { Admin } from '../models/admin.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from './asyncHandler.util.js';

/**
 * Middleware to verify if a logged-in user is an admin with a specific permission level.
 * This should always be used *after* the verifyJWT middleware.
 *
 * @param {number} requiredPermissionLevel - The minimum permission level required to access the route.
 */
export const verifyAdmin = (requiredPermissionLevel = 1) => {
  return asyncHandler(async (req, _, next) => {
    // 1. Get the user from the request object (attached by verifyJWT)
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized. User not logged in.');
    }

    // 2. Find the admin record associated with the user
    const admin = await Admin.findOne({ user: userId });

    if (!admin) {
      throw new ApiError(403, 'Forbidden. User is not an admin.');
    }

    // 3. Check if the admin's permission level is sufficient
    if (admin.permissionLevel < requiredPermissionLevel) {
      throw new ApiError(
        403,
        'Forbidden. You do not have sufficient permissions for this action.'
      );
    }

    // 4. Attach the admin record to the request for later use
    req.admin = admin;
    next();
  });
};
