import { logService } from '../services/logging.service.js';

// A simple formatter to make console logs look nice
const printLog = (level, message, meta) => {
  const timestamp = new Date().toLocaleTimeString();
  const levelColors = {
    INFO: '\x1b[32m', // Green
    WARN: '\x1b[33m', // Yellow
    ERROR: '\x1b[31m', // Red
    FATAL: '\x1b[35m', // Magenta
    DEBUG: '\x1b[36m', // Cyan
    ROUTE: '\x1b[34m', // Blue
  };
  const color = levelColors[level] || '\x1b[0m'; // Default color
  const resetColor = '\x1b[0m';

  console.log(`${timestamp} ${color}[${level}]${resetColor}: ${message}`);
  if (meta) {
    console.log(meta);
  }
};

const createLogEntry = (level, source, message, meta, userId = null) => {
  // ALWAYS print to console so we can see logs in Render dashboard
  printLog(level, message, meta);

  // Send the log to the database in the background ("fire and forget")
  logService.createLog({
    level,
    source,
    message,
    meta,
    userId,
  }).catch(err => {
    // If the logger itself fails, log an error to the console
    console.error("Logger failed to save log to DB:", err);
  });
};

// The logger object you will import and use
export const log = {
  info: (source, message, meta, userId) => createLogEntry('INFO', source, message, meta, userId),
  warn: (source, message, meta, userId) => createLogEntry('WARN', source, message, meta, userId),
  error: (source, message, meta, userId) => createLogEntry('ERROR', source, message, meta, userId),
  fatal: (source, message, meta, userId) => createLogEntry('FATAL', source, message, meta, userId),
  debug: (source, message, meta, userId) => createLogEntry('DEBUG', source, message, meta, userId),
  route: (source, message, meta, userId) => createLogEntry('ROUTE', source, message, meta, userId),
};

