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
    try {
      console.log('[verifyJWT] Incoming Authorization header:', req.header('Authorization'));
    } catch (logErr) {
      // swallow logging errors
    }
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log('[verifyJWT] No token found on request');
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next(); 
  } catch (error) {

  console.error('[verifyJWT] Token verification failed:', error?.message || error);
  throw new ApiError(401, error?.message || "Invalid access token");
  }
});
