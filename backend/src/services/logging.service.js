import { Log } from '../models/logging.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Creates a new log entry in the database.
 * This is the core function for both frontend and backend logging.
 * @param {object} logData - The data for the new log.
 * @param {string} logData.level - The severity level of the log (e.g., 'INFO', 'ERROR').
 * @param {string} logData.source - Where the log originated (e.g., 'frontend', 'backend').
 * @param {string} logData.message - The main log message.
 * @param {string} [logData.userId] - Optional ID of the user associated with the event.
 * @param {object} [logData.meta] - Optional additional data (e.g., error stack, request info).
 * @returns {Promise<Log>} The created log object.
 */
const createLog = async (logData) => {
  const { level, source, message, userId, meta } = logData;

  if (!level || !source || !message) {
    throw new ApiError(400, 'Log level, source, and message are required.');
  }

  const logEntry = await Log.create({
    level,
    source,
    message,
    user: userId || null,
    meta,
  });

  return logEntry;
};

/**
 * Retrieves logs from the database with filtering and pagination.
 * @param {object} filters - An object containing filters (e.g., { level: 'ERROR' }).
 * @param {object} options - An object for pagination (e.g., { page: 1, limit: 20 }).
 * @returns {Promise<object>} An object containing the logs and pagination details.
 */
const getLogs = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  // Build the query object from the filters
  const query = {};
  if (filters.level) {
    query.level = filters.level;
  }
  if (filters.source) {
    query.source = filters.source;
  }
  if (filters.userId) {
    query.user = filters.userId;
  }

  const logs = await Log.find(query)
    .populate('user', 'username email') // Show user details with the log
    .sort({ createdAt: -1 }) // Show newest logs first
    .skip(skip)
    .limit(limit);

  const totalLogs = await Log.countDocuments(query);

  return {
    logs,
    totalPages: Math.ceil(totalLogs / limit),
    currentPage: page,
    totalLogs,
  };
};

/**
 * Deletes all logs from the database. A very dangerous operation.
 */
const deleteAllLogs = async () => {
    await Log.deleteMany({});
};


export const logService = {
  createLog,
  getLogs,
  deleteAllLogs,
};
