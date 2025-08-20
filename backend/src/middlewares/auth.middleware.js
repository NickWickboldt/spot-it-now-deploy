import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";

/**
 * Middleware to verify a user's JSON Web Token (JWT).
 * It extracts the token from cookies or the Authorization header,
 * verifies it, and attaches the authenticated user's data to the request object.
 */
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Debug: log incoming auth header and cookies to help diagnose 401s
    // NOTE: This is temporary debugging output. Remove or redact in production.
    try {
      console.log('[verifyJWT] Incoming Authorization header:', req.header('Authorization'));
      console.log('[verifyJWT] Incoming cookies:', req.cookies);
    } catch (logErr) {
      // swallow logging errors
    }
    // 1. Extract the token from the user's cookies or Authorization header.
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log('[verifyJWT] No token found on request');
      throw new ApiError(401, "Unauthorized request");
    }

    // 2. Verify the token using the secret key.
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Find the user in the database based on the ID from the token.
    // We exclude the password and refreshToken fields for security.
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // This handles cases where the user may have been deleted but the token still exists.
      throw new ApiError(401, "Invalid Access Token");
    }

    // 4. Attach the user object to the request.
    // This makes the user's data available in any subsequent controller functions.
    req.user = user;
    next(); // Pass control to the next middleware or controller.
  } catch (error) {
  // Handle specific JWT errors like expiration.
  console.error('[verifyJWT] Token verification failed:', error?.message || error);
  throw new ApiError(401, error?.message || "Invalid access token");
  }
});
