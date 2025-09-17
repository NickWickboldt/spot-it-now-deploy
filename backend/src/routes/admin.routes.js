import { Router } from 'express';
import {
    changeAdminPermissionLevel,
    getAdminDetails,
    getAllAdmins,
    promoteUserToAdmin,
    removeAdminPrivileges,
} from '../controllers/admin.controller.js';
import {
    getAnimalStats,
    populateAnimals,
} from '../controllers/animalPopulation.controller.js';
import { verifyAdmin } from '../middlewares/admin.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply JWT verification to all routes in this file
router.use(verifyJWT);

// --- Super Admin Routes ---
// These routes require the highest permission level (e.g., level 2)
// Only a Super Admin can promote a user or remove admin privileges.
router.route('/promote').post(verifyAdmin(1), promoteUserToAdmin);
router.route('/:adminId/demote').delete(verifyAdmin(2), removeAdminPrivileges);
router.route('/:adminId/permission').patch(verifyAdmin(2), changeAdminPermissionLevel);


// --- General Admin Routes ---
// These routes can be accessed by any admin (permission level 1 or higher)
router.route('/').get(verifyAdmin(1), getAllAdmins);
router.route('/:adminId').get(verifyAdmin(1), getAdminDetails);

// --- Animal Management Routes ---
router.route('/populate-animals').post(verifyAdmin(1), populateAnimals);
router.route('/animal-stats').get(verifyAdmin(1), getAnimalStats);


export default router;