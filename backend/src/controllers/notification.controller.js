import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { notificationService } from '../services/notification.service.js';

/**
 * Controller for an admin to send a notification to a specific user.
 */
const sendNotificationToUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const notificationData = req.body;
  const notification = await notificationService.sendNotificationToUser(userId, notificationData);
  return res
    .status(201)
    .json(new ApiResponse(201, notification, 'Notification sent to user successfully'));
});

/**
 * Controller for an admin to send a global notification to all users.
 */
const sendGlobalNotification = asyncHandler(async (req, res) => {
  const notificationData = req.body;
  const notification = await notificationService.sendGlobalNotification(notificationData);
  return res
    .status(201)
    .json(new ApiResponse(201, notification, 'Global notification sent successfully'));
});

/**
 * Controller for a user to get their own notifications.
 */
const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id; // From verifyJWT middleware
  const notifications = await notificationService.getNotificationsForUser(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, notifications, 'Notifications fetched successfully'));
});

/**
 * Controller for a user to mark one of their notifications as read.
 */
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;
  const notification = await notificationService.markNotificationAsRead(notificationId, userId);
  return res
    .status(200)
    .json(new ApiResponse(200, notification, 'Notification marked as read'));
});

/**
 * Controller for a user to mark all of their unread notifications as read.
 */
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    await notificationService.markAllNotificationsAsRead(userId);
    return res
        .status(200)
        .json(new ApiResponse(200, {}, 'All notifications marked as read'));
});

/**
 * Controller for an admin to delete any notification.
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  await notificationService.deleteNotification(notificationId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Notification deleted successfully'));
});

export {
  sendNotificationToUser,
  sendGlobalNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};