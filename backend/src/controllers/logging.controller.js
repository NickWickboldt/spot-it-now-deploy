import { logService } from '../services/logging.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Controller for submitting a new log entry.
 * This can be called from the frontend or other backend services.
 */
const submitLog = asyncHandler(async (req, res) => {
  // If a user is logged in, their ID will be attached to the request.
  const userId = req.user?._id || null;
  const logData = { ...req.body, userId };

  const newLog = await logService.createLog(logData);
  return res
    .status(201)
    .json(new ApiResponse(201, newLog, 'Log created successfully'));
});

/**
 * Controller for admins to retrieve logs with filtering and pagination.
 */
const getLogs = asyncHandler(async (req, res) => {
  // Filters and pagination options come from query parameters.
  // e.g., /logs?level=ERROR&page=1&limit=50
  const filters = {
    level: req.query.level,
    source: req.query.source,
    userId: req.query.userId,
  };
  const options = {
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await logService.getLogs(filters, options);
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Logs fetched successfully'));
});

/**
 * Controller for a super admin to delete all logs.
 */
const deleteAllLogs = asyncHandler(async (req, res) => {
    await logService.deleteAllLogs();
    return res
        .status(200)
        .json(new ApiResponse(200, {}, 'All logs have been deleted.'));
});


export {
    deleteAllLogs, getLogs, submitLog
};
