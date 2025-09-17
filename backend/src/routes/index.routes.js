import { Router } from 'express';
import achievementRouter from './achievement.routes.js';
import adminRouter from './admin.routes.js';
import animalRouter from './animal.routes.js';
import commentRouter from './comment.routes.js';
import followRouter from './follow.routes.js';
import likeRouter from './like.routes.js';
import loggingRouter from './logging.routes.js';
import notificationRouter from './notification.routes.js';
import sightingRouter from './sighting.routes.js';
import uploadRouter from './upload.routes.js';
import userRouter from './user.routes.js';
import userAchievementRouter from './userAchievement.routes.js';
import userDiscoveryRouter from './userDiscovery.routes.js';

const router = Router();

// Define the base path for each set of routes
router.use('/users', userRouter);
router.use('/users', userDiscoveryRouter);
router.use('/admins', adminRouter);
router.use('/animals', animalRouter);
router.use('/sightings', sightingRouter);
router.use('/likes', likeRouter);
router.use('/follows', followRouter);
router.use('/comments', commentRouter);
router.use('/achievements', achievementRouter);
router.use('/userAchievements', userAchievementRouter);
router.use('/notifications', notificationRouter);
router.use('/loggings', loggingRouter);
router.use('/uploads', uploadRouter);

export default router;
