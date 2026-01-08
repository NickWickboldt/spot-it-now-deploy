import * as messageService from '../services/message.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Get all conversations for the authenticated user
 * GET /api/v1/messages/conversations
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const conversations = await messageService.getConversationsForUser(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, conversations, 'Conversations fetched successfully'));
});

/**
 * Get or create a conversation with another user
 * POST /api/v1/messages/conversations
 * Body: { recipientId }
 */
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { recipientId } = req.body;

  if (!recipientId) {
    return res.status(400).json(new ApiResponse(400, null, 'recipientId is required'));
  }

  const conversation = await messageService.getOrCreateConversation(
    userId.toString(),
    recipientId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, conversation, 'Conversation fetched successfully'));
});

/**
 * Get messages for a conversation
 * GET /api/v1/messages/conversations/:conversationId/messages
 * Query: { limit, before, after }
 */
export const getMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;
  const { limit, before, after } = req.query;

  const options = {
    limit: limit ? parseInt(limit, 10) : 50,
    before,
    after,
  };

  const messages = await messageService.getMessagesForConversation(
    conversationId,
    userId.toString(),
    options
  );

  return res
    .status(200)
    .json(new ApiResponse(200, messages, 'Messages fetched successfully'));
});

/**
 * Send a message in a conversation
 * POST /api/v1/messages/conversations/:conversationId/messages
 * Body: { content, attachments }
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;
  const { content, attachments } = req.body;

  const message = await messageService.sendMessage(
    conversationId,
    userId.toString(),
    { content, attachments }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, message, 'Message sent successfully'));
});

/**
 * Send a message to a user (creates conversation if needed)
 * POST /api/v1/messages/send
 * Body: { recipientId, content, attachments }
 */
export const sendMessageToUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { recipientId, content, attachments } = req.body;

  if (!recipientId) {
    return res.status(400).json(new ApiResponse(400, null, 'recipientId is required'));
  }

  const result = await messageService.sendMessageToUser(
    userId.toString(),
    recipientId,
    { content, attachments }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, result, 'Message sent successfully'));
});

/**
 * Mark messages as read in a conversation
 * POST /api/v1/messages/conversations/:conversationId/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  const count = await messageService.markMessagesAsRead(
    conversationId,
    userId.toString()
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { markedAsRead: count }, 'Messages marked as read'));
});

/**
 * Get unread message count for the user
 * GET /api/v1/messages/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const count = await messageService.getUnreadCountForUser(userId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, { unreadCount: count }, 'Unread count fetched successfully'));
});

/**
 * Delete a message
 * DELETE /api/v1/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  await messageService.deleteMessage(messageId, userId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Message deleted successfully'));
});

/**
 * Delete a conversation
 * DELETE /api/v1/messages/conversations/:conversationId
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  await messageService.deleteConversation(conversationId, userId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Conversation deleted successfully'));
});

/**
 * Get message requests for the authenticated user
 * GET /api/v1/messages/requests
 */
export const getMessageRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const requests = await messageService.getMessageRequestsForUser(userId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, requests, 'Message requests fetched successfully'));
});

/**
 * Accept a message request
 * POST /api/v1/messages/requests/:conversationId/accept
 */
export const acceptMessageRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  const conversation = await messageService.acceptMessageRequest(
    conversationId,
    userId.toString()
  );

  return res
    .status(200)
    .json(new ApiResponse(200, conversation, 'Message request accepted'));
});

/**
 * Reject a message request
 * POST /api/v1/messages/requests/:conversationId/reject
 */
export const rejectMessageRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  await messageService.rejectMessageRequest(conversationId, userId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Message request rejected'));
});

/**
 * Get messaging privacy setting
 * GET /api/v1/messages/privacy
 */
export const getMessagingPrivacy = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const privacy = await messageService.getMessagingPrivacy(userId.toString());

  return res
    .status(200)
    .json(new ApiResponse(200, { messagingPrivacy: privacy }, 'Privacy setting fetched'));
});

/**
 * Update messaging privacy setting
 * PUT /api/v1/messages/privacy
 * Body: { setting: 'everyone' | 'followers' }
 */
export const updateMessagingPrivacy = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { setting } = req.body;

  if (!setting) {
    return res.status(400).json(new ApiResponse(400, null, 'setting is required'));
  }

  const user = await messageService.updateMessagingPrivacy(userId.toString(), setting);

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'Privacy setting updated'));
});

export default {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  sendMessageToUser,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  deleteConversation,
  getMessageRequests,
  acceptMessageRequest,
  rejectMessageRequest,
  getMessagingPrivacy,
  updateMessagingPrivacy,
};
