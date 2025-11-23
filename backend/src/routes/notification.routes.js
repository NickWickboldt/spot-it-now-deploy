import { Router } from 'express';
import {
    deleteNotification,
    getMyNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    sendGlobalNotification,
    sendNotificationToUser,
} from '../controllers/notification.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- User-Specific Routes ---
// These routes are for a logged-in user to manage their own notifications.
router.route('/my-notifications').get(verifyJWT, getMyNotifications);
router.route('/read/:notificationId').patch(verifyJWT, markNotificationAsRead);
router.route('/read-all').post(verifyJWT, markAllNotificationsAsRead);
router.route('/:notificationId').delete(verifyJWT, deleteNotification);


// --- Admin-Only Routes ---
// These actions require the user to be a logged-in admin.
router.route('/send/user/:userId').post(verifyJWT, verifyAdmin(1), sendNotificationToUser);
router.route('/send/global').post(verifyJWT, verifyAdmin(1), sendGlobalNotification);


export default router;