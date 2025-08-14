import { Router } from 'express';
import {
  sendNotificationToUser,
  sendGlobalNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../controllers/notification.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// --- User-Specific Routes ---
// These routes are for a logged-in user to manage their own notifications.
router.route('/my-notifications').get(verifyJWT, getMyNotifications);
router.route('/read/:notificationId').patch(verifyJWT, markNotificationAsRead);
router.route('/read-all').post(verifyJWT, markAllNotificationsAsRead);


// --- Admin-Only Routes ---
// These actions require the user to be a logged-in admin.
router.route('/send/user/:userId').post(verifyJWT, verifyAdmin(1), sendNotificationToUser);
router.route('/send/global').post(verifyJWT, verifyAdmin(1), sendGlobalNotification);
router.route('/delete/:notificationId').delete(verifyJWT, verifyAdmin(1), deleteNotification);


export default router;