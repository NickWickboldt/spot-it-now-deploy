import { Admin } from '../models/admin.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.util.js';

/**
 * Creates a new user in the database.
 * @param {object} userData - The user's registration data (username, email, password).
 * @returns {Promise<User>} The created user object without the password.
 */
const registerUser = async (userData) => {
  const { username, email, password } = userData;
  if ([username, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  const user = await User.create({ username: username.toLowerCase(), email, password });
  const createdUser = await User.findById(user._id).select("-password");
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  return createdUser;
};

/**
 * Authenticates a user and generates tokens.
 * @param {object} loginData - User's login credentials (email, username, password).
 * @returns {Promise<{loggedInUser: User, accessToken: string, refreshToken: string}>}
 */
const loginUser = async (loginData) => {
  const { username, password } = loginData;
  if (!username) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  return { loggedInUser, accessToken, refreshToken };
};

/**
 * Logs out a user by clearing their refresh token.
 * @param {string} userId - The ID of the user to log out.
 */
const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { $set: { refreshToken: undefined } }, { new: true });
};

/**
 * Fetches a user by their ID.
 * @param {string} userId - The ID of the user to fetch.
 * @returns {Promise<User>} The user object.
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password -refreshToken');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

/**
 * Returns role string ('admin'|'user') for a given userId by checking Admin table.
 */
const getRoleForUser = async (userId) => {
  try {
    const adminRecord = await Admin.findOne({ user: userId });
    return adminRecord ? 'admin' : 'user';
  } catch (e) {
    return 'user';
  }
};

/**
 * Returns a user object (without password/refreshToken) annotated with role.
 */
const getUserWithRoleById = async (userId) => {
  const user = await User.findById(userId).select('-password -refreshToken');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const role = await getRoleForUser(userId);
  const userObj = user.toObject ? user.toObject() : { ...user };
  userObj.role = role;
  return userObj;
};

/**
 * Updates multiple user details at once.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updateData - An object containing the fields to update.
 * @returns {Promise<User>} The updated user object.
 */
const updateUser = async (userId, updateData) => {
  const { username, email, profilePictureUrl, bio, experiencePoints, longitude, latitude, radius } = updateData;
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { username, bio, profilePictureUrl, email, experiencePoints, longitude, latitude, radius } },
    { new: true }
  ).select('-password -refreshToken');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

/**
 * Deletes a user from the database.
 * @param {string} userId - The ID of the user to delete.
 */
const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
};


/**
 * Gets a single field from a user's document.
 * @param {string} userId - The ID of the user.
 * @param {string} fieldName - The name of the field to retrieve.
 * @returns {Promise<any>} The value of the requested field.
 */
const getUserField = async (userId, fieldName) => {
    const user = await User.findById(userId).select(fieldName);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return user[fieldName];
};

/**
 * Fetches all users from the database.
 * @returns {Promise<User[]>} Array of user objects without password and refreshToken.
 */
const getAllUsers = async () => {
  const users = await User.find().select('-password -refreshToken');
  // Fetch admin records once and build a set for fast lookup
  const admins = await Admin.find().select('user');
  const adminSet = new Set(admins.map(a => String(a.user)));

  // Annotate each user with role
  const annotated = users.map(u => {
    const userObj = u.toObject ? u.toObject() : { ...u };
    userObj.role = adminSet.has(String(u._id)) ? 'admin' : 'user';
    return userObj;
  });
  return annotated;
};

/**
 * Returns a paginated list of users with optional search.
 * @param {{page?: number, pageSize?: number, q?: string}} options
 */
const getUsersPage = async ({ page = 1, pageSize = 20, q = '' } = {}) => {
  const filter = {};
  if (q && q.trim() !== '') {
    const re = new RegExp(q.trim(), 'i');
    filter.$or = [{ username: re }, { email: re }];
  }

  const total = await User.countDocuments(filter);
  const skip = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const users = await User.find(filter)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(pageSize));

  const admins = await Admin.find().select('user');
  const adminSet = new Set(admins.map(a => String(a.user)));

  const annotated = users.map(u => {
    const userObj = u.toObject ? u.toObject() : { ...u };
    userObj.role = adminSet.has(String(u._id)) ? 'admin' : 'user';
    return userObj;
  });

  return { items: annotated, total, page: Number(page), pageSize: Number(pageSize) };
};

/**
 * Updates one or more specific fields for a user.
 * @param {string} userId - The ID of the user to update.
 * @param {object} fieldsToUpdate - An object with the key-value pairs to update.
 * @returns {Promise<User>} The updated user object.
 */
const updateUserField = async (userId, fieldsToUpdate) => {
    const user = await User.findByIdAndUpdate(
        userId,
        { $set: fieldsToUpdate },
        { new: true }
    ).select('-password -refreshToken');

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return user;
};

export const userService = {
  registerUser,
  loginUser,
  logoutUser,
  getUserById,
  getUserWithRoleById,
  getRoleForUser,
  updateUser,
  deleteUser,
  getUserField,
  updateUserField,
  getAllUsers,
  getUsersPage
};
