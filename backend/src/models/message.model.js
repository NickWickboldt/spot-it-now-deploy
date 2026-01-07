import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'mixed'],
      default: 'text',
    },
    // Media attachments (images/videos via Cloudinary)
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String, // Cloudinary public ID for deletion
        },
        type: {
          type: String,
          enum: ['image', 'video'],
          required: true,
        },
        thumbnailUrl: {
          type: String, // Video thumbnail
        },
        width: Number,
        height: Number,
        duration: Number, // Video duration in seconds
      },
    ],
    // Read receipt
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Soft delete - message can be deleted by sender
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient message fetching
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Get messages for a conversation with pagination
messageSchema.statics.getMessagesForConversation = async function (
  conversationId,
  options = {}
) {
  const { limit = 50, before = null, after = null } = options;

  const query = {
    conversation: conversationId,
    isDeleted: false,
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  } else if (after) {
    query.createdAt = { $gt: new Date(after) };
  }

  return this.find(query)
    .populate('sender', 'username profilePictureUrl')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Mark messages as read
messageSchema.statics.markMessagesAsRead = async function (
  conversationId,
  userId
) {
  const result = await this.updateMany(
    {
      conversation: conversationId,
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

// Get unread message count for a user
messageSchema.statics.getUnreadCountForUser = async function (userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });
};

export const Message = mongoose.model('Message', messageSchema);
