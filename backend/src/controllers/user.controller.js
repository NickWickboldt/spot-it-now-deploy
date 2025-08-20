// --- Get All Users ---

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  return res.status(200).json(new ApiResponse(200, users, "All users fetched successfully"));
});
import { userService } from "../services/user.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";

// --- Auth Controllers ---

const registerUser = asyncHandler(async (req, res) => {
  const createdUser = await userService.registerUser(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { loggedInUser, accessToken, refreshToken } = await userService.loginUser(req.body);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };
  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged In Successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await userService.logoutUser(req.user._id);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };
  return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged Out"));
});


// --- General User CRUD ---

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "User profile fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUser(req.user._id, req.body);
  return res.status(200).json(new ApiResponse(200, updatedUser, "User details updated successfully"));
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.user._id);
  return res.status(200).json(new ApiResponse(200, {}, "User account deleted successfully"));
});

// --- Individual Field Getters ---

const getUserUsername = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const username = await userService.getUserField(userId, 'username');
    return res.status(200).json(new ApiResponse(200, { username }, "Username fetched successfully"));
});

const getUserEmail = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const email = await userService.getUserField(userId, 'email');
    return res.status(200).json(new ApiResponse(200, { email }, "Email fetched successfully"));
});

const getUserProfilePicture = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const profilePictureUrl = await userService.getUserField(userId, 'profilePictureUrl');
    return res.status(200).json(new ApiResponse(200, { profilePictureUrl }, "Profile picture fetched successfully"));
});

const getUserBio = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const bio = await userService.getUserField(userId, 'bio');
    return res.status(200).json(new ApiResponse(200, { bio }, "Bio fetched successfully"));
});

const getUserExperiencePoints = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const experiencePoints = await userService.getUserField(userId, 'experiencePoints');
    return res.status(200).json(new ApiResponse(200, { experiencePoints }, "Experience points fetched successfully"));
});


// --- Individual Field Setters ---

const setUserUsername = asyncHandler(async (req, res) => {
    const { username } = req.body;
    const updatedUser = await userService.updateUserField(req.user._id, { username });
    return res.status(200).json(new ApiResponse(200, updatedUser, "Username updated successfully"));
});

const setUserEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const updatedUser = await userService.updateUserField(req.user._id, { email });
    return res.status(200).json(new ApiResponse(200, updatedUser, "Email updated successfully"));
});

const setUserProfilePicture = asyncHandler(async (req, res) => {
    const { profilePictureUrl } = req.body;
    const updatedUser = await userService.updateUserField(req.user._id, { profilePictureUrl });
    return res.status(200).json(new ApiResponse(200, updatedUser, "Profile picture updated successfully"));
});

const setUserBio = asyncHandler(async (req, res) => {
    const { bio } = req.body;
    const updatedUser = await userService.updateUserField(req.user._id, { bio });
    return res.status(200).json(new ApiResponse(200, updatedUser, "Bio updated successfully"));
});

const setUserExperiencePoints = asyncHandler(async (req, res) => {
    const { experiencePoints } = req.body;
    const updatedUser = await userService.updateUserField(req.user._id, { experiencePoints });
    return res.status(200).json(new ApiResponse(200, updatedUser, "Experience points updated successfully"));
});

// --- Admin Actions (operate on arbitrary users) ---

const adminGetUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await userService.getUserById(userId);
  return res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
});

const adminUpdateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updatedUser = await userService.updateUser(userId, req.body);
  return res.status(200).json(new ApiResponse(200, updatedUser, 'User updated successfully'));
});

const adminDeleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await userService.deleteUser(userId);
  return res.status(200).json(new ApiResponse(200, {}, 'User deleted successfully'));
});

const adminForceLogoutUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await userService.logoutUser(userId);
  return res.status(200).json(new ApiResponse(200, {}, 'User forcefully logged out'));
});


export {
  adminDeleteUser,
  adminForceLogoutUser,
  // admin exports
  adminGetUserById,
  adminUpdateUser, deleteUserAccount, getAllUsers, getCurrentUser,
  getUserBio,
  getUserEmail,
  getUserExperiencePoints,
  getUserProfilePicture,
  getUserUsername,
  loginUser,
  logoutUser,
  registerUser,
  setUserBio,
  setUserEmail,
  setUserExperiencePoints,
  setUserProfilePicture,
  setUserUsername,
  updateUserDetails
};

