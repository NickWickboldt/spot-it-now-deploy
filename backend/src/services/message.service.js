import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import {
    emitNewMessage,
    emitReadReceipt,
    isUserOnline,
} from '../socket/index.js';
import { ApiError } from '../utils/ApiError.util.js';
import { formatAnimalNotification } from '../utils/animalSounds.js';
import { followService } from './follow.service.js';
import { sendNotificationToUser } from './notification.service.js';

/**
 * Get or create a conversation between two users
 * Handles message request logic based on recipient's privacy settings
 * @param {string} userId1 - First user ID (initiator)
 * @param {string} userId2 - Second user ID (recipient)
 * @returns {Promise<Conversation>}
 */
export const getOrCreateConversation = async (userId1, userId2) => {
  if (userId1 === userId2) {
    throw new ApiError(400, 'Cannot create conversation with yourself');
  }

  // Verify both users exist and get their settings
  const [user1, user2] = await Promise.all([
    User.findById(userId1),
    User.findById(userId2),
  ]);

  if (!user1 || !user2) {
    throw new ApiError(404, 'One or both users not found');
  }

  // Check if conversation already exists
  const participants = [userId1, userId2].sort();
  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
    isActive: true,
  });

  if (!conversation) {
    // New conversation - check if we need to make it a message request
    let requestStatus = 'approved';
    
    // Check recipient's messaging privacy settings
    if (user2.messagingPrivacy === 'followers') {
      // Check if sender follows recipient
      const isFollowing = await followService.checkIsFollowing(userId1, userId2);
      if (!isFollowing) {
        // This becomes a message request
        requestStatus = 'pending';
      }
    }

    const unreadCounts = new Map();
    unreadCounts.set(userId1.toString(), 0);
    unreadCounts.set(userId2.toString(), 0);

    conversation = await Conversation.create({
      participants,
      unreadCounts,
      requestStatus,
      initiatedBy: userId1,
      pendingMessageCount: 0,
    });
  }

  // Populate participants for response
  await conversation.populate('participants', 'username profilePictureUrl');

  return conversation;
};

/**
 * Get all conversations for a user
 * @param {string} userId
 * @param {Object} options - { includeRequests: boolean }
 * @returns {Promise<Conversation[]>}
 */
export const getConversationsForUser = async (userId, options = {}) => {
  const { includeRequests = true } = options;
  
  // Build query based on whether to include message requests
  const query = {
    participants: userId,
    isActive: true,
  };
  
  // Get all conversations
  const conversations = await Conversation.find(query)
    .populate('participants', 'username profilePictureUrl')
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender',
    })
    .sort({ lastMessageAt: -1 });

  // Add online status and format for response
  const conversationsWithStatus = conversations.map((conv) => {
    const convObj = conv.toObject();
    const otherParticipant = convObj.participants.find(
      (p) => p._id.toString() !== userId
    );

    // Determine if this is a message request for the current user
    const isMessageRequest = 
      convObj.requestStatus === 'pending' && 
      convObj.initiatedBy?.toString() !== userId;

    return {
      ...convObj,
      otherParticipant,
      unreadCount: convObj.unreadCounts?.get(userId) || 0,
      isOnline: otherParticipant ? isUserOnline(otherParticipant._id.toString()) : false,
      isMessageRequest,
      isPending: convObj.requestStatus === 'pending',
    };
  });

  if (!includeRequests) {
    // Filter out pending message requests where user is the recipient
    return conversationsWithStatus.filter(conv => !conv.isMessageRequest);
  }

  return conversationsWithStatus;
};

/**
 * Get message requests for a user (conversations pending approval)
 * @param {string} userId
 * @returns {Promise<Conversation[]>}
 */
export const getMessageRequestsForUser = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
    requestStatus: 'pending',
    initiatedBy: { $ne: userId }, // Only show requests from others
  })
    .populate('participants', 'username profilePictureUrl')
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender',
    })
    .sort({ lastMessageAt: -1 });

  return conversations.map((conv) => {
    const convObj = conv.toObject();
    const otherParticipant = convObj.participants.find(
      (p) => p._id.toString() !== userId
    );

    return {
      ...convObj,
      otherParticipant,
      unreadCount: convObj.unreadCounts?.get(userId) || 0,
      isOnline: otherParticipant ? isUserOnline(otherParticipant._id.toString()) : false,
      isMessageRequest: true,
    };
  });
};

/**
 * Get messages for a conversation with pagination
 * @param {string} conversationId
 * @param {string} userId - Requesting user (for permission check)
 * @param {Object} options - Pagination options
 * @returns {Promise<Message[]>}
 */
export const getMessagesForConversation = async (
  conversationId,
  userId,
  options = {}
) => {
  // Verify user is participant of conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this conversation');
  }

  const messages = await Message.getMessagesForConversation(
    conversationId,
    options
  );

  return messages;
};

/**
 * Send a message in a conversation
 * @param {string} conversationId
 * @param {string} senderId
 * @param {Object} messageData - { content, attachments }
 * @returns {Promise<Message>}
 */
export const sendMessage = async (conversationId, senderId, messageData) => {
  const { content, attachments = [] } = messageData;

  // Validate content
  if (!content && attachments.length === 0) {
    throw new ApiError(400, 'Message must have content or attachments');
  }

  // Get conversation and verify sender is participant
  const conversation = await Conversation.findById(conversationId).populate(
    'participants',
    'username profilePictureUrl notificationsEnabled messagingPrivacy'
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === senderId
  );
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this conversation');
  }

  // Get recipient (the other participant)
  const recipient = conversation.participants.find(
    (p) => p._id.toString() !== senderId
  );
  const sender = conversation.participants.find(
    (p) => p._id.toString() === senderId
  );

  // Check message request limits
  // If conversation is pending and sender is the initiator, only allow 1 message
  if (
    conversation.requestStatus === 'pending' &&
    conversation.initiatedBy?.toString() === senderId
  ) {
    if (conversation.pendingMessageCount >= 1) {
      throw new ApiError(
        403,
        'You can only send one message until the recipient accepts your request'
      );
    }
  }

  // If conversation is rejected, don't allow sender to send more messages
  if (
    conversation.requestStatus === 'rejected' &&
    conversation.initiatedBy?.toString() === senderId
  ) {
    throw new ApiError(403, 'This message request was declined');
  }

  // Determine message type
  let messageType = 'text';
  if (attachments.length > 0 && !content) {
    messageType = attachments[0].type; // 'image' or 'video'
  } else if (attachments.length > 0 && content) {
    messageType = 'mixed';
  }

  // Create the message
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    recipient: recipient._id,
    content: content || '',
    messageType,
    attachments,
  });

  // Update conversation
  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;

  // Increment unread count for recipient
  const currentUnread = conversation.unreadCounts.get(recipient._id.toString()) || 0;
  conversation.unreadCounts.set(recipient._id.toString(), currentUnread + 1);

  // Increment pending message count if this is a message request
  if (
    conversation.requestStatus === 'pending' &&
    conversation.initiatedBy?.toString() === senderId
  ) {
    conversation.pendingMessageCount += 1;
  }

  await conversation.save();

  // Populate sender for response
  await message.populate('sender', 'username profilePictureUrl');

  // Emit real-time event
  emitNewMessage(conversationId, message, senderId);

  // Send notification if recipient is offline or has notifications enabled
  if (recipient.notificationsEnabled !== false) {
    const animalNotif = formatAnimalNotification(sender.username);

    // Prepare notification message preview
    let messagePreview = content?.substring(0, 100) || '';
    if (attachments.length > 0 && !content) {
      const attachmentType = attachments[0].type === 'image' ? 'a photo' : 'a video';
      messagePreview = `Sent ${attachmentType}`;
    }

    await sendNotificationToUser(recipient._id, {
      type: 'new_message',
      title: animalNotif.title,
      subtitle: animalNotif.subtitle,
      message: messagePreview,
      relatedUser: senderId,
      mediaUrls: attachments.length > 0 ? [attachments[0].url] : [],
    });
  }

  return message;
};

/**
 * Send a message to a user (creates conversation if needed)
 * @param {string} senderId
 * @param {string} recipientId
 * @param {Object} messageData
 * @returns {Promise<{ conversation: Conversation, message: Message }>}
 */
export const sendMessageToUser = async (senderId, recipientId, messageData) => {
  const conversation = await getOrCreateConversation(senderId, recipientId);
  const message = await sendMessage(conversation._id, senderId, messageData);

  return { conversation, message };
};

/**
 * Mark messages as read
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<number>} Number of messages marked as read
 */
export const markMessagesAsRead = async (conversationId, userId) => {
  // Verify user is participant
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this conversation');
  }

  // Get unread message IDs before marking them read
  const unreadMessages = await Message.find({
    conversation: conversationId,
    recipient: userId,
    isRead: false,
  }).select('_id');

  const messageIds = unreadMessages.map((m) => m._id.toString());

  // Mark messages as read
  const count = await Message.markMessagesAsRead(conversationId, userId);

  // Reset unread count for user
  conversation.unreadCounts.set(userId, 0);
  await conversation.save();

  // Emit read receipt
  if (messageIds.length > 0) {
    emitReadReceipt(conversationId, messageIds, userId);
  }

  return count;
};

/**
 * Get total unread message count for a user
 * @param {string} userId
 * @returns {Promise<number>}
 */
export const getUnreadCountForUser = async (userId) => {
  return Message.getUnreadCountForUser(userId);
};

/**
 * Delete a message (soft delete)
 * @param {string} messageId
 * @param {string} userId
 * @returns {Promise<Message>}
 */
export const deleteMessage = async (messageId, userId) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.sender.toString() !== userId) {
    throw new ApiError(403, 'You can only delete your own messages');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  return message;
};

/**
 * Delete a conversation (soft delete)
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<Conversation>}
 */
export const deleteConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this conversation');
  }

  conversation.isActive = false;
  await conversation.save();

  return conversation;
};

/**
 * Accept a message request
 * @param {string} conversationId
 * @param {string} userId - User accepting the request (recipient)
 * @returns {Promise<Conversation>}
 */
export const acceptMessageRequest = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this conversation');
  }

  // Only the recipient (not the initiator) can accept
  if (conversation.initiatedBy?.toString() === userId) {
    throw new ApiError(403, 'You cannot accept your own message request');
  }

  if (conversation.requestStatus !== 'pending') {
    throw new ApiError(400, 'This conversation is not a pending message request');
  }

  conversation.requestStatus = 'approved';
  await conversation.save();

  await conversation.populate('participants', 'username profilePictureUrl');

  return conversation;
};

/**
 * Reject a message request
 * @param {string} conversationId
 * @param {string} userId - User rejecting the request (recipient)
 * @returns {Promise<Conversation>}
 */
export const rejectMessageRequest = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant of this conversation');
  }

  // Only the recipient (not the initiator) can reject
  if (conversation.initiatedBy?.toString() === userId) {
    throw new ApiError(403, 'You cannot reject your own message request');
  }

  if (conversation.requestStatus !== 'pending') {
    throw new ApiError(400, 'This conversation is not a pending message request');
  }

  conversation.requestStatus = 'rejected';
  await conversation.save();

  return conversation;
};

/**
 * Update user's messaging privacy setting
 * @param {string} userId
 * @param {string} setting - 'everyone' or 'followers'
 * @returns {Promise<User>}
 */
export const updateMessagingPrivacy = async (userId, setting) => {
  if (!['everyone', 'followers'].includes(setting)) {
    throw new ApiError(400, 'Invalid messaging privacy setting');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { messagingPrivacy: setting },
    { new: true }
  ).select('messagingPrivacy');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

/**
 * Get user's messaging privacy setting
 * @param {string} userId
 * @returns {Promise<string>}
 */
export const getMessagingPrivacy = async (userId) => {
  const user = await User.findById(userId).select('messagingPrivacy');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user.messagingPrivacy || 'everyone';
};

export default {
  getOrCreateConversation,
  getConversationsForUser,
  getMessageRequestsForUser,
  getMessagesForConversation,
  sendMessage,
  sendMessageToUser,
  markMessagesAsRead,
  getUnreadCountForUser,
  deleteMessage,
  deleteConversation,
  acceptMessageRequest,
  rejectMessageRequest,
  updateMessagingPrivacy,
  getMessagingPrivacy,
};
