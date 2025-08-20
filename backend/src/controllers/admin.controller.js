import { adminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';

/**
 * Controller to promote a regular user to an admin.
 */
const promoteUserToAdmin = asyncHandler(async (req, res) => {
  const { userId, permissionLevel } = req.body;
  const newAdmin = await adminService.createAdmin(userId, permissionLevel);
  return res
    .status(201)
    .json(new ApiResponse(201, newAdmin, 'User has been successfully promoted to admin'));
});

/**
 * Controller to remove admin privileges from a user.
 */
const removeAdminPrivileges = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  await adminService.deleteAdmin(adminId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Admin privileges have been successfully removed'));
});

/**
 * Controller to get details of a specific admin record.
 */
const getAdminDetails = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const adminDetails = await adminService.getAdminById(adminId);
  return res
    .status(200)
    .json(new ApiResponse(200, adminDetails, 'Admin details fetched successfully'));
});

/**
 * Controller to get a list of all admins.
 */
const getAllAdmins = asyncHandler(async (req, res) => {
  const allAdmins = await adminService.getAllAdmins();
  return res
    .status(200)
    .json(new ApiResponse(200, allAdmins, 'All admins fetched successfully'));
});

/**
 * Controller to change an admin's permission level.
 */
const changeAdminPermissionLevel = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { permissionLevel } = req.body;
  const updatedAdmin = await adminService.updateAdminPermission(adminId, permissionLevel);
  return res
    .status(200)
    .json(new ApiResponse(200, updatedAdmin, 'Admin permission level updated successfully'));
});

export {
  changeAdminPermissionLevel, getAdminDetails,
  getAllAdmins, promoteUserToAdmin,
  removeAdminPrivileges
};

