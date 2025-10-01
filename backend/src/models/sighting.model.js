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
    // The AnimalDex entry officially linked to this sighting.
    // Resolved via admin mapping or manual identification.
    animalId: {
      type: Schema.Types.ObjectId,
      ref: 'Animal',
      default: null,
      index: true,
    },
    // The original AI-provided common name string.
    aiIdentification: {
      type: String,
      trim: true,
      default: null,
    },
    // Confidence score returned by the AI (0-100).
    confidence: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
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
    // Verification status - how the animal identification has been verified
    verifiedByAI: {
      type: Boolean,
      default: false,
      description: 'Whether this sighting was verified by AI identification'
    },
    verifiedByUser: {
      type: Boolean,
      default: false,
      description: 'Whether this sighting was verified by a user'
    },
    verifiedByCommunity: {
      type: Boolean,
      default: false,
      description: 'Whether this sighting was verified by the community'
    },
    communityReview: {
      approvals: {
        type: Number,
        default: 0,
      },
      rejections: {
        type: Number,
        default: 0,
      },
      lastReviewedAt: {
        type: Date,
        default: null,
      },
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
    ,
    // Denormalized comments count for quick feed display
    comments: {
      type: Number,
      default: 0,
    }
    ,
    // Structured identification (replaces caption parsing logic on client)
    identification: {
      source: { type: String, enum: ['AI', 'USER', 'COMMUNITY'], default: null },
      commonName: { type: String, trim: true },
      scientificName: { type: String, trim: true },
      confidence: { type: Number }
    }
  },
  // The `timestamps` option automatically adds `createdAt` and `updatedAt` fields
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create a 2dsphere index on the location field to enable geospatial queries.
// This is crucial for features like "find sightings near me".
sightingSchema.index({ location: '2dsphere' });

// Allow population using the legacy `animal` path expected by existing clients.
sightingSchema.virtual('animal', {
  ref: 'Animal',
  localField: 'animalId',
  foreignField: '_id',
  justOne: true,
});

// Index commonly queried AI identification strings for admin workflows.
sightingSchema.index({ aiIdentification: 1 });

export const Sighting = mongoose.model('Sighting', sightingSchema);
