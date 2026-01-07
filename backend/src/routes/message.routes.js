import { Router } from 'express';
import {
    acceptMessageRequest,
    deleteConversation,
    deleteMessage,
    getConversations,
    getMessageRequests,
    getMessages,
    getMessagingPrivacy,
    getOrCreateConversation,
    getUnreadCount,
    markAsRead,
    rejectMessageRequest,
    sendMessage,
    sendMessageToUser,
    updateMessagingPrivacy,
} from '../controllers/message.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Privacy settings
router.route('/privacy')
  .get(getMessagingPrivacy)        // Get messaging privacy setting
  .put(updateMessagingPrivacy);    // Update messaging privacy setting

// Message requests
router.route('/requests')
  .get(getMessageRequests);        // Get pending message requests

router.route('/requests/:conversationId/accept')
  .post(acceptMessageRequest);     // Accept a message request

router.route('/requests/:conversationId/reject')
  .post(rejectMessageRequest);     // Reject a message request

// Conversation routes
router.route('/conversations')
  .get(getConversations)           // Get all conversations
  .post(getOrCreateConversation);  // Create/get conversation with user

router.route('/conversations/:conversationId')
  .delete(deleteConversation);     // Delete a conversation

router.route('/conversations/:conversationId/messages')
  .get(getMessages)                // Get messages in conversation
  .post(sendMessage);              // Send message in conversation

router.route('/conversations/:conversationId/read')
  .post(markAsRead);               // Mark messages as read

// Direct message to user (creates conversation if needed)
router.route('/send')
  .post(sendMessageToUser);

// Unread count
router.route('/unread-count')
  .get(getUnreadCount);

// Message operations
router.route('/:messageId')
  .delete(deleteMessage);          // Delete a message

export default router;
