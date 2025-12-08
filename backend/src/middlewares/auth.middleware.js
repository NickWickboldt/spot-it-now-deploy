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

/**
 * Optional JWT middleware that attempts to verify a token but continues without error if none is present.
 * Populates req.user if a valid token is found, otherwise req.user remains undefined.
 * This is useful for routes that can benefit from user context but should remain publicly accessible.
 */
export const optionalJWT = async (req, _, next) => {
  console.log('[OPTIONAL JWT - MIDDLEWARE HIT]', {
    path: req.originalUrl,
    method: req.method,
  });
  
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.header("Authorization");
    const token =
      authHeader?.replace("Bearer ", "") ||
      req.cookies?.accessToken;

    console.log('[OPTIONAL JWT] Token extraction:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 20),
      hasCookie: !!req.cookies?.accessToken,
      tokenExtracted: !!token,
      path: req.originalUrl
    });

    // If no token present, just continue without setting req.user
    if (!token) {
      console.log('[OPTIONAL JWT] No token, continuing as public');
      log.debug('optional-auth-middleware', 'No token found, continuing as public request', { 
        path: req.originalUrl 
      });
      return next();
    }

    // Try to verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    console.log('[OPTIONAL JWT] Token verified:', {
      userId: decodedToken?._id,
      username: decodedToken?.username
    });

    // Find the user
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      console.log('[OPTIONAL JWT] User not found, continuing as public');
      log.warn('optional-auth-middleware', 'Token valid but user not found, continuing as public', {
        tokenUserId: decodedToken?._id
      });
      return next();
    }

    // Attach user to request
    req.user = user;
    console.log('[OPTIONAL JWT] User authenticated:', {
      userId: user._id,
      username: user.username,
      path: req.originalUrl
    });
    log.debug('optional-auth-middleware', 'User authenticated', {
      userId: user._id,
      username: user.username
    });
    next();
  } catch (error) {
    // If token verification fails, just continue as public request
    console.log('[OPTIONAL JWT] Token verification failed:', {
      error: error?.message || error,
      path: req.originalUrl 
    });
    log.debug('optional-auth-middleware', 'Token verification failed, continuing as public request', { 
      error: error?.message || error,
      path: req.originalUrl 
    });
    next();
  }
};
