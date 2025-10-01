import { Router } from 'express';
import { createAnimalMapping, getUnmappedAINames, updateAnimalMapping } from '../controllers/animalMapping.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT, verifyAdmin(1));

router.route('/unmapped').get(getUnmappedAINames);
router.route('/').post(createAnimalMapping);
router.route('/:id').patch(updateAnimalMapping);

export default router;
