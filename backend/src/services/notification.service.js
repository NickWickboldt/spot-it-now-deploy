import { Notification } from '../models/notification.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.util.js';

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
 * This includes both direct notifications and global notifications.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Notification[]>} An array of notification objects.
 */
const getNotificationsForUser = async (userId) => {
  // Get user-specific notifications
  const userNotifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).lean();
  
  // Get global notifications (where user is null)
  const globalNotifications = await Notification.find({ user: null }).sort({ createdAt: -1 }).lean();
  
  // Mark global notifications as read if the user has read them
  const processedGlobalNotifications = globalNotifications.map((notification) => ({
    ...notification,
    isRead: notification.readBy?.some(id => id.toString() === userId.toString()) || false,
  }));
  
  // Combine and sort by creation date
  const allNotifications = [...userNotifications, ...processedGlobalNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return allNotifications;
};

/**
 * Marks a specific notification as read.
 * @param {string} notificationId - The ID of the notification to mark as read.
 * @param {string} userId - The ID of the user who owns the notification.
 * @returns {Promise<Notification>} The updated notification object.
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  // If it's a user-specific notification, verify ownership
  if (notification.user) {
    if (notification.user.toString() !== userId.toString()) {
      throw new ApiError(403, 'You do not have permission to modify this notification');
    }
    notification.isRead = true;
  } else {
    // For global notifications, add user to readBy array if not already there
    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
    }
  }

  await notification.save();
  return notification;
};

/**
 * Marks all unread notifications for a user as read.
 * @param {string} userId - The ID of the user.
 */
const markAllNotificationsAsRead = async (userId) => {
  // Mark all user-specific notifications as read
  await Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
  
  // Add user to readBy array for all global notifications they haven't read
  await Notification.updateMany(
    { user: null, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
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