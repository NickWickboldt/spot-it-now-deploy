import { Router } from 'express';
import {
  deleteUserAccount,
  getAllUsers,
  getCurrentUser,
  getUserBio,
  getUserExperiencePoints,
  getUserProfilePicture,
  getUserUsername,
  loginUser,
  logoutUser,
  registerUser,
  setUserBio,
  setUserEmail,
  setUserProfilePicture,
  setUserUsername,
  updateUserDetails
} from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// --- Public Auth Routes ---
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

// --- Secured Auth Routes ---
router.route('/logout').post(verifyJWT, logoutUser);

// --- Secured General CRUD Routes ---
router.route('/me').get(verifyJWT, getCurrentUser);
router.route('/me').patch(verifyJWT, updateUserDetails);
router.route('/me').delete(verifyJWT, deleteUserAccount);

// --- Public Getter Routes ---
// These allow anyone to get basic, non-sensitive info about a user.
router.route('/').get(getAllUsers);
router.route('/:userId/username').get(getUserUsername);
router.route('/:userId/profile-picture').get(getUserProfilePicture);
router.route('/:userId/bio').get(getUserBio);
router.route('/:userId/experience').get(getUserExperiencePoints);
// Note: Exposing an email getter is often a privacy risk, so it's left out.
// router.route('/:userId/email').get(getUserEmail);


// --- Secured Setter Routes ---
// These ensure only the logged-in user can change their own details.
router.route('/me/username').patch(verifyJWT, setUserUsername);
router.route('/me/email').patch(verifyJWT, setUserEmail); // A user should be able to change their own email
router.route('/me/profile-picture').patch(verifyJWT, setUserProfilePicture);
router.route('/me/bio').patch(verifyJWT, setUserBio);
// Note: Experience points should likely be updated by game logic, not directly by the user.
// router.route('/me/experience').patch(verifyJWT, setUserExperiencePoints);

export default router;