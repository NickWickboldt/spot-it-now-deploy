import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Creates a notification for a single, specific user.
 * @param {string} userId - The ID of the user to notify.
 * @param {object} notificationData - The content of the notification.
 * @returns {Promise<Notification>} The created notification object.
 */
const sendNotificationToUser = async (userId, notificationData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User to notify not found.');
  }

  const notification = await Notification.create({
    ...notificationData,
    user: userId,
  });

  return notification;
};

/**
 * Creates a global notification for all users.
 * This is achieved by creating a notification with a null user field.
 * @param {object} notificationData - The content of the notification.
 * @returns {Promise<Notification>} The created global notification object.
 */
const sendGlobalNotification = async (notificationData) => {
  const notification = await Notification.create({
    ...notificationData,
    user: null,
  });

  return notification;
};

/**
 * Gets all notifications for a specific user.
 * This includes both direct notifications and unread global notifications.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Notification[]>} An array of notification objects.
 */
const getNotificationsForUser = async (userId) => {
  const userNotifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
  // Find global notifications that the user hasn't implicitly "read" or dismissed.
  // This logic can be expanded later. For now, we'll just get direct ones.
  // In a real system, you'd also fetch global notifications created after the user's last check-in.
  return userNotifications;
};

/**
 * Marks a specific notification as read.
 * @param {string} notificationId - The ID of the notification to mark as read.
 * @param {string} userId - The ID of the user who owns the notification.
 * @returns {Promise<Notification>} The updated notification object.
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw new ApiError(404, 'Notification not found or you do not have permission to view it.');
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Marks all unread notifications for a user as read.
 * @param {string} userId - The ID of the user.
 */
const markAllNotificationsAsRead = async (userId) => {
    await Notification.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
    );
};


/**
 * Deletes a specific notification.
 * @param {string} notificationId - The ID of the notification to delete.
 */
const deleteNotification = async (notificationId) => {
  const notification = await Notification.findByIdAndDelete(notificationId);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
};

export const notificationService = {
  sendNotificationToUser,
  sendGlobalNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};