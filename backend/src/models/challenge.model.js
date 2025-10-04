import mongoose, { Schema } from 'mongoose';

const challengeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    animals: [{ type: Schema.Types.ObjectId, ref: 'Animal', default: [] }],
    // Optional: how many of the listed animals must be completed
    targetCount: { type: Number, min: 1 },
    // New: per-animal tasks, each with required count
    tasks: [
      {
        animal: { type: Schema.Types.ObjectId, ref: 'Animal', required: true },
        required: { type: Number, required: true, min: 1, default: 1 },
      },
    ],
    center: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    radiusMeters: { type: Number, required: true, min: 0 },
    activeFrom: { type: Date, required: true },
    activeTo: { type: Date, required: true },
    scope: { type: String, enum: ['DAILY', 'WEEKLY', 'CUSTOM'], default: 'DAILY' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

challengeSchema.index({ center: '2dsphere' });

export const Challenge = mongoose.model('Challenge', challengeSchema);
