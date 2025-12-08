import { Router } from 'express';
import { getTrendingSearches, search } from '../controllers/search.controller.js';
import { optionalJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Public search routes - optional auth for user-specific data like isLikedByUser
router.get('/', optionalJWT, search);
router.get('/trending', getTrendingSearches);

export default router;
