import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Notification model.
 * This can represent system-wide announcements or user-specific alerts.
 */
const notificationSchema = new Schema(
  {
    // The user this notification is for.
    // If null, it's a global notification for all users.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // The type of notification (e.g., 'sighting_approved', 'new_achievement', 'admin_message').
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Optional: URLs for any associated images or media.
    mediaUrls: [
      {
        type: String,
      },
    ],
    // Optional: Reference to the user who triggered this notification (e.g., the liker, commenter, follower)
    relatedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Optional: Reference to the sighting this notification is about
    relatedSighting: {
      type: Schema.Types.ObjectId,
      ref: 'Sighting',
      default: null,
    },
    // Optional: For location-based notifications.
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    // Optional: The radius in meters for a location-based notification.
    radius: {
      type: Number,
    },
    // To track if the user has read the notification (for user-specific notifications).
    isRead: {
        type: Boolean,
        default: false,
    },
    // For global notifications: track which users have read it
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  // The `timestamps` option automatically adds `createdAt` and `updatedAt` fields.
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);