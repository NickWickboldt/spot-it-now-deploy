import { Router } from 'express';
import {
    deleteAllLogs,
    getLogs,
    submitLog,
} from '../controllers/logging.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Secured User Route ---
// Allows a logged-in user (i.e., the frontend app) to submit a log entry.
// The user's ID is automatically attached from their token.
router.route('/submit').post(verifyJWT, submitLog);


// --- Admin-Only Routes ---
// Allows admins to view the logs. Can be filtered with query parameters.
router.route('/').get(verifyJWT, verifyAdmin(1), getLogs);

// A dangerous route for super admins (level 2+) to clear all logs.
router.route('/all').delete(verifyJWT, verifyAdmin(2), deleteAllLogs);


export default router;
