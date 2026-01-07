/**
 * Message API Client
 * 
 * Handles all messaging-related API calls
 */

import { fetchWithAuth } from './client';

// Types
export interface Attachment {
  url: string;
  publicId?: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    username: string;
    profilePictureUrl?: string;
  };
  recipient: string;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'mixed';
  attachments: Attachment[];
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  _id: string;
  username: string;
  profilePictureUrl?: string;
}

export interface Conversation {
  _id: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    _id: string;
    content: string;
    messageType: string;
    createdAt: string;
    sender: string;
  };
  lastMessageAt: string;
  unreadCount: number;
  otherParticipant: ConversationParticipant;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  // Message request fields
  requestStatus?: 'approved' | 'pending' | 'rejected';
  isMessageRequest?: boolean;
  isPending?: boolean;
  initiatedBy?: string;
  pendingMessageCount?: number;
}

export interface SendMessageData {
  content?: string;
  attachments?: Attachment[];
}

// API Functions

/**
 * Get all conversations for the authenticated user
 */
export const apiGetConversations = async (token: string): Promise<Conversation[]> => {
  const data = await fetchWithAuth('/messages/conversations', token);
  return data.data || [];
};

/**
 * Get or create a conversation with another user
 */
export const apiGetOrCreateConversation = async (
  token: string,
  recipientId: string
): Promise<Conversation> => {
  const data = await fetchWithAuth('/messages/conversations', token, {
    method: 'POST',
    body: JSON.stringify({ recipientId }),
  });
  return data.data;
};

/**
 * Get messages for a conversation
 */
export const apiGetMessages = async (
  token: string,
  conversationId: string,
  options?: { limit?: number; before?: string; after?: string }
): Promise<Message[]> => {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.before) params.append('before', options.before);
  if (options?.after) params.append('after', options.after);
  
  const queryString = params.toString();
  const url = `/messages/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
  
  const data = await fetchWithAuth(url, token);
  return data.data || [];
};

/**
 * Send a message in a conversation
 */
export const apiSendMessage = async (
  token: string,
  conversationId: string,
  messageData: SendMessageData
): Promise<Message> => {
  const data = await fetchWithAuth(
    `/messages/conversations/${conversationId}/messages`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(messageData),
    }
  );
  return data.data;
};

/**
 * Send a message to a user (creates conversation if needed)
 */
export const apiSendMessageToUser = async (
  token: string,
  recipientId: string,
  messageData: SendMessageData
): Promise<{ conversation: Conversation; message: Message }> => {
  const data = await fetchWithAuth('/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({ recipientId, ...messageData }),
  });
  return data.data;
};

/**
 * Mark messages as read in a conversation
 */
export const apiMarkMessagesAsRead = async (
  token: string,
  conversationId: string
): Promise<{ markedAsRead: number }> => {
  const data = await fetchWithAuth(
    `/messages/conversations/${conversationId}/read`,
    token,
    {
      method: 'POST',
    }
  );
  return data.data;
};

/**
 * Get unread message count
 */
export const apiGetUnreadCount = async (token: string): Promise<number> => {
  const data = await fetchWithAuth('/messages/unread-count', token);
  return data.data?.unreadCount || 0;
};

/**
 * Delete a message
 */
export const apiDeleteMessage = async (
  token: string,
  messageId: string
): Promise<void> => {
  await fetchWithAuth(`/messages/${messageId}`, token, {
    method: 'DELETE',
  });
};

/**
 * Delete a conversation
 */
export const apiDeleteConversation = async (
  token: string,
  conversationId: string
): Promise<void> => {
  await fetchWithAuth(
    `/messages/conversations/${conversationId}`,
    token,
    {
      method: 'DELETE',
    }
  );
};

// Message Request APIs

/**
 * Get message requests (pending conversations from non-followers)
 */
export const apiGetMessageRequests = async (token: string): Promise<Conversation[]> => {
  const data = await fetchWithAuth('/messages/requests', token);
  return data.data || [];
};

/**
 * Accept a message request
 */
export const apiAcceptMessageRequest = async (
  token: string,
  conversationId: string
): Promise<Conversation> => {
  const data = await fetchWithAuth(
    `/messages/requests/${conversationId}/accept`,
    token,
    {
      method: 'POST',
    }
  );
  return data.data;
};

/**
 * Reject a message request
 */
export const apiRejectMessageRequest = async (
  token: string,
  conversationId: string
): Promise<void> => {
  await fetchWithAuth(
    `/messages/requests/${conversationId}/reject`,
    token,
    {
      method: 'POST',
    }
  );
};

// Privacy Settings APIs

export type MessagingPrivacy = 'everyone' | 'followers';

/**
 * Get messaging privacy setting
 */
export const apiGetMessagingPrivacy = async (token: string): Promise<MessagingPrivacy> => {
  const data = await fetchWithAuth('/messages/privacy', token);
  return data.data?.messagingPrivacy || 'everyone';
};

/**
 * Update messaging privacy setting
 */
export const apiUpdateMessagingPrivacy = async (
  token: string,
  setting: MessagingPrivacy
): Promise<void> => {
  await fetchWithAuth('/messages/privacy', token, {
    method: 'PUT',
    body: JSON.stringify({ setting }),
  });
};
