import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";
import { log } from "../utils/logger.util.js";

/**
 * Middleware to verify a user's JSON Web Token (JWT).
 * It extracts the token from cookies or the Authorization header,
 * verifies it, and attaches the authenticated user's data to the request object.
 */
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    try {
      log.debug('auth-middleware', 'Incoming Authorization header', {
        authHeader: req.header('Authorization')
      });
    } catch (logErr) {
      // swallow logging errors
    }
    // CRITICAL: Check Authorization header FIRST before cookies
    // Frontend sends token via header, cookies may contain stale tokens
    const token =
      req.header("Authorization")?.replace("Bearer ", "") ||
      req.cookies?.accessToken;

    if (!token) {
      log.warn('auth-middleware', 'No token found on request', { path: req.originalUrl, method: req.method });
      throw new ApiError(401, "Unauthorized request");
    }

    log.debug('auth-middleware', 'Extracted token string', {
      tokenPrefix: token.substring(0, 30),
      tokenLength: token.length,
      source: req.cookies?.accessToken ? 'cookie' : 'header'
    });

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    log.debug('auth-middleware', 'Token verified successfully', {
      decodedUserId: decodedToken?._id,
      decodedUsername: decodedToken?.username
    });

    log.debug('auth-middleware', 'Raw decoded JWT', {
      fullToken: decodedToken,
      path: req.originalUrl
    });

    log.debug('auth-middleware', 'Decoded JWT token', {
      tokenId: decodedToken?._id,
      tokenUsername: decodedToken?.username,
      tokenEmail: decodedToken?.email,
      path: req.originalUrl
    });

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next(); 
  } catch (error) {

  log.error('auth-middleware', 'Token verification failed', { error: error?.message || error, path: req.originalUrl });
  throw new ApiError(401, error?.message || "Invalid access token");
  }
});
