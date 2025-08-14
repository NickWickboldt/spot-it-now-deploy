import { Admin } from '../models/admin.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Creates a new admin record for a given user.
 * @param {string} userId - The ID of the user to make an admin.
 * @param {number} permissionLevel - The permission level for the new admin.
 * @returns {Promise<Admin>} The created admin object.
 */
const createAdmin = async (userId, permissionLevel = 1) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User to be promoted does not exist.');
  }

  const existingAdmin = await Admin.findOne({ user: userId });
  if (existingAdmin) {
    throw new ApiError(409, 'This user is already an admin.');
  }

  const admin = await Admin.create({
    user: userId,
    permissionLevel,
  });

  return admin;
};

/**
 * Deletes an admin record.
 * @param {string} adminId - The ID of the admin record to delete.
 */
const deleteAdmin = async (adminId) => {
  const admin = await Admin.findByIdAndDelete(adminId);
  if (!admin) {
    throw new ApiError(404, 'Admin record not found.');
  }
};

/**
 * Fetches an admin record by its ID.
 * @param {string} adminId - The ID of the admin record.
 * @returns {Promise<Admin>} The admin object, populated with user details.
 */
const getAdminById = async (adminId) => {
  const admin = await Admin.findById(adminId).populate('user', 'username email');
  if (!admin) {
    throw new ApiError(404, 'Admin record not found.');
  }
  return admin;
};

/**
 * Fetches all admin records.
 * @returns {Promise<Admin[]>} An array of all admin objects.
 */
const getAllAdmins = async () => {
  return await Admin.find({}).populate('user', 'username email');
};

/**
 * Updates an admin's permission level.
 * @param {string} adminId - The ID of the admin record to update.
 * @param {number} newPermissionLevel - The new permission level.
 * @returns {Promise<Admin>} The updated admin object.
 */
const updateAdminPermission = async (adminId, newPermissionLevel) => {
  if (typeof newPermissionLevel !== 'number') {
    throw new ApiError(400, 'Permission level must be a number.');
  }

  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { $set: { permissionLevel: newPermissionLevel } },
    { new: true }
  );

  if (!admin) {
    throw new ApiError(404, 'Admin record not found to update.');
  }
  return admin;
};

export const adminService = {
  createAdmin,
  deleteAdmin,
  getAdminById,
  getAllAdmins,
  updateAdminPermission,
};
