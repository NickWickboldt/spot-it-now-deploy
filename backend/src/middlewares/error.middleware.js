import { log } from '../utils/logger.util.js';
import { ApiError } from '../utils/ApiError.util.js';

// Centralized error handler to ensure consistent responses and logging
export const errorHandler = (err, req, res, next) => {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : 'Internal Server Error';

  const userId = req.user?._id || null;
  log.error('backend-error', message, {
    name: err?.name,
    stack: err?.stack,
    route: `${req.method} ${req.originalUrl}`,
    status,
  }, userId);

  res.status(status).json({
    statusCode: status,
    data: null,
    message,
    success: false,
    errors: err?.errors || [],
  });
};

