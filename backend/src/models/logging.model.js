import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Logging model.
 * This collection will store various log entries from both the
 * frontend and backend for debugging and monitoring purposes.
 */
const loggingSchema = new Schema(
  {
    // The user associated with the log event.
    // Can be null for system-level or anonymous events.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // The severity or type of the log.
    level: {
      type: String,
      required: true,
      enum: ['INFO', 'WARN', 'ERROR', 'FATAL', 'DEBUG', 'ROUTE'],
      default: 'INFO',
    },
    // The source of the log (e.g., 'frontend', 'backend-auth', 'backend-api').
    source: {
        type: String,
        required: true,
        default: 'unknown',
    },
    // The main log message.
    message: {
      type: String,
      required: true,
    },
    // A place to store additional structured data, like error stacks or request bodies.
    meta: {
        type: Schema.Types.Mixed, // Allows for any data type (object, string, etc.)
    }
  },
  // The `timestamps` option automatically adds a `createdAt` field.
  {
    timestamps: true,
  }
);

// TTL index for log retention. Deletes documents after LOG_TTL_DAYS.
// Defaults to 30 days if not specified.
const days = Number(process.env.LOG_TTL_DAYS || 30);
const expireAfterSeconds = Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60 : 30 * 24 * 60 * 60;
loggingSchema.index({ createdAt: 1 }, { expireAfterSeconds });
// Helpful index for admin queries
loggingSchema.index({ level: 1, source: 1, createdAt: -1 });

export const Log = mongoose.model('Log', loggingSchema);
