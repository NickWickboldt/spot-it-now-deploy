import { Router } from 'express';
import {
    addImageUrl,
    createAnimal,
    deleteAnimal,
    findAnimalByIdentification,
    getAllAnimals,
    getAnimalById,
    getAnimalField,
    removeImageUrl,
    setAnimalField,
    updateAnimal,
} from '../controllers/animal.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Public Routes ---
// Anyone can view the list of animals or details about a specific one.
router.route('/').get(getAllAnimals);
router.route('/:animalId').get(getAnimalById);
router.route('/:animalId/field/:fieldName').get(getAnimalField);

// Animal matching/identification endpoint
router.route('/match').post(findAnimalByIdentification);


// --- Admin-Only Routes ---
// These actions require the user to be a logged-in admin.
// We apply both middlewares in sequence.
router.route('/create').post(verifyJWT, verifyAdmin(1), createAnimal);
router.route('/:animalId/update').patch(verifyJWT, verifyAdmin(1), updateAnimal);
router.route('/:animalId/delete').delete(verifyJWT, verifyAdmin(1), deleteAnimal);

// Setters for individual fields
router.route('/:animalId/field/:fieldName').patch(verifyJWT, verifyAdmin(1), setAnimalField);

// Add/remove from arrays
router.route('/:animalId/images/add').post(verifyJWT, verifyAdmin(1), addImageUrl);
router.route('/:animalId/images/remove').post(verifyJWT, verifyAdmin(1), removeImageUrl);


export default router;
