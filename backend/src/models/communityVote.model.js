import mongoose, { Schema } from 'mongoose';

/**
 * CommunityVote stores individual user votes on community verification tasks.
 * Each user can vote at most once per sighting.
 */
const communityVoteSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sighting: {
      type: Schema.Types.ObjectId,
      ref: 'Sighting',
      required: true,
      index: true,
    },
    vote: {
      type: String,
      enum: ['APPROVE', 'REJECT'],
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

communityVoteSchema.index({ user: 1, sighting: 1 }, { unique: true });

export const CommunityVote = mongoose.model('CommunityVote', communityVoteSchema);
