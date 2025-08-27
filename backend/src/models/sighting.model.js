import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Sighting model.
 * This represents a single instance of a user spotting an animal.
 */
const sightingSchema = new Schema(
  {
    // The user who created the sighting post.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The animal that was officially identified in the sighting.
    // This can be null initially and confirmed later by an admin or AI.
    animal: {
      type: Schema.Types.ObjectId,
      ref: 'Animal',
      default: null,
    },
    // The animal that the AI *thinks* was sighted.
    aiIdentification: {
        type: Schema.Types.ObjectId,
        ref: 'Animal',
        default: null,
    },
    // URLs for the photos or videos uploaded by the user.
    mediaUrls: [
      {
        type: String,
        required: true,
      },
    ],
    // Geographic location of the sighting.
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        }
    },
    caption: {
      type: String,
      trim: true,
    },
    // The moderation status of the post.
    aiModerationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // If true, the sighting is hidden from the public feed.
    isPrivate: {
      type: Boolean,
      default: false,
    },
    userName: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    }
  },
  // The `timestamps` option automatically adds `createdAt` and `updatedAt` fields
  {
    timestamps: true,
  }
);

// Create a 2dsphere index on the location field to enable geospatial queries.
// This is crucial for features like "find sightings near me".
sightingSchema.index({ location: '2dsphere' });

export const Sighting = mongoose.model('Sighting', sightingSchema);