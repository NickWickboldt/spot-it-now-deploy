import { fetchWithAuth } from './client';

/**
 * Database notification interface matching backend model
 */
export interface DbNotification {
  _id: string;
  user?: string | null;
  type: string;
  title: string;
  subtitle?: string;
  message: string;
  mediaUrls?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  radius?: number;
  isRead: boolean;
  readBy?: string[]; // Array of user IDs who have read this global notification
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for sending notifications
 */
export interface NotificationPayload {
  type: string;
  title: string;
  subtitle?: string;
  message: string;
  mediaUrls?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  radius?: number;
}

/**
 * Get all notifications for the current user
 */
export const apiGetMyNotifications = async (token: string): Promise<DbNotification[]> => {
  const response = await fetchWithAuth('/notifications/my-notifications', token);
  return response.data;
};

/**
 * Mark a specific notification as read
 */
export const apiMarkNotificationAsRead = async (
  token: string,
  notificationId: string
): Promise<DbNotification> => {
  const response = await fetchWithAuth(
    `/notifications/read/${notificationId}`,
    token,
    { method: 'PATCH' }
  );
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const apiMarkAllNotificationsAsRead = async (token: string): Promise<void> => {
  await fetchWithAuth('/notifications/read-all', token, { method: 'POST' });
};

/**
 * Admin: Send notification to a specific user
 */
export const apiSendNotificationToUser = async (
  token: string,
  userId: string,
  notificationData: NotificationPayload
): Promise<DbNotification> => {
  const response = await fetchWithAuth(
    `/notifications/send/user/${userId}`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(notificationData),
    }
  );
  return response.data;
};

/**
 * Admin: Send global notification to all users
 */
export const apiSendGlobalNotification = async (
  token: string,
  notificationData: NotificationPayload
): Promise<DbNotification> => {
  const response = await fetchWithAuth(
    '/notifications/send/global',
    token,
    {
      method: 'POST',
      body: JSON.stringify(notificationData),
    }
  );
  return response.data;
};

/**
 * Admin: Delete a notification
 */
export const apiDeleteNotification = async (
  token: string,
  notificationId: string
): Promise<void> => {
  await fetchWithAuth(`/notifications/delete/${notificationId}`, token, {
    method: 'DELETE',
  });
};
