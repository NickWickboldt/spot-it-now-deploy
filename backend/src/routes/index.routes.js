import { Router } from 'express';
import achievementRouter from './achievement.routes.js';
import adminRouter from './admin.routes.js';
import algorithmRouter from './algorithm.routes.js';
import animalRouter from './animal.routes.js';
import challengeRouter from './challenge.routes.js';
import commentRouter from './comment.routes.js';
import experienceRouter from './experience.routes.js';
import followRouter from './follow.routes.js';
import likeRouter from './like.routes.js';
import loggingRouter from './logging.routes.js';
import mappingRouter from './mapping.routes.js';
import messageRouter from './message.routes.js';
import notificationRouter from './notification.routes.js';
import regionalChallengeRouter from './regionalChallenge.routes.js';
import searchRouter from './search.routes.js';
import sightingRouter from './sighting.routes.js';
import uploadRouter from './upload.routes.js';
import userRouter from './user.routes.js';
import userAchievementRouter from './userAchievement.routes.js';
import userDiscoveryRouter from './userDiscovery.routes.js';
import verificationRouter from './verification.routes.js';

const router = Router();

// Define the base path for each set of routes
router.use('/users', userRouter);
router.use('/users', userDiscoveryRouter);
router.use('/admins', adminRouter);
router.use('/algorithm', algorithmRouter);
router.use('/animals', animalRouter);
router.use('/experience', experienceRouter);
router.use('/search', searchRouter);
router.use('/sightings', sightingRouter);
router.use('/likes', likeRouter);
router.use('/follows', followRouter);
router.use('/comments', commentRouter);
router.use('/achievements', achievementRouter);
router.use('/challenges', challengeRouter);
router.use('/regional-challenges', regionalChallengeRouter);
router.use('/userAchievements', userAchievementRouter);
router.use('/notifications', notificationRouter);
router.use('/messages', messageRouter);
router.use('/loggings', loggingRouter);
router.use('/uploads', uploadRouter);
router.use('/mappings', mappingRouter);
router.use('/verify', verificationRouter);

export default router;
