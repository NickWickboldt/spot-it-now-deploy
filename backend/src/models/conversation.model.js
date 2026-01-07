import mongoose, { Schema } from 'mongoose';

const conversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // Track unread counts per participant
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Track if conversation is active (not deleted by either party)
    isActive: {
      type: Boolean,
      default: true,
    },
    // Message request status: 'approved', 'pending', or 'rejected'
    // Used when recipient has messagingPrivacy set to 'followers'
    requestStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    // Who initiated the conversation (for message requests)
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Number of messages allowed before approval (for pending requests)
    pendingMessageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of user's conversations
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Find or create a conversation between two users
conversationSchema.statics.findOrCreateConversation = async function (
  userId1,
  userId2
) {
  // Sort participant IDs to ensure consistent lookup
  const participants = [userId1, userId2].sort();

  let conversation = await this.findOne({
    participants: { $all: participants, $size: 2 },
    isActive: true,
  });

  if (!conversation) {
    const unreadCounts = new Map();
    unreadCounts.set(userId1.toString(), 0);
    unreadCounts.set(userId2.toString(), 0);

    conversation = await this.create({
      participants,
      unreadCounts,
    });
  }

  return conversation;
};

// Get all conversations for a user
conversationSchema.statics.getConversationsForUser = async function (userId) {
  return this.find({
    participants: userId,
    isActive: true,
  })
    .populate('participants', 'username profilePictureUrl')
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender',
    })
    .sort({ lastMessageAt: -1 });
};

export const Conversation = mongoose.model('Conversation', conversationSchema);
