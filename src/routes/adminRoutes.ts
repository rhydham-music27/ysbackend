import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  createUser,
  listAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignUserRole,
  activateUser,
  deactivateUser,
  bulkImportUsersController,
  bulkEnrollStudentsController,
  getSettings,
  updateSetting,
  deleteSetting,
  getAuditLogsController,
  getMyAuditLogs,
  getUserStats,
} from '../controllers/adminController';
import {
  createUserValidation,
  updateUserValidation,
  assignRoleValidation,
  bulkImportUsersValidation,
  bulkEnrollmentValidation,
  updateSettingValidation,
  userIdParamValidation,
  settingKeyParamValidation,
  auditLogQueryValidation,
  userQueryValidation,
  handleAdminValidationErrors,
} from '../validators/adminValidator';

const router = Router();

/**
 * @route   GET /api/v1/admin/users/stats
 * @desc    Get user statistics (total, by role, active/inactive, recent)
 * @access  Private (Admin only)
 */
router.get('/users/stats', authenticate, authorize(UserRole.ADMIN), getUserStats);

/**
 * @route   POST /api/v1/admin/bulk/import-users
 * @desc    Bulk import users (max 100 per request)
 * @access  Private (Admin only)
 * @body    { users: [{ email, password, role, profile: { firstName, lastName, phone? } }] }
 */
router.post(
  '/bulk/import-users',
  authenticate,
  authorize(UserRole.ADMIN),
  bulkImportUsersValidation,
  handleAdminValidationErrors,
  bulkImportUsersController
);

/**
 * @route   POST /api/v1/admin/bulk/enroll-students
 * @desc    Bulk enroll students in a course (max 100 per request)
 * @access  Private (Admin only)
 * @body    { courseId, studentIds: [string] }
 */
router.post(
  '/bulk/enroll-students',
  authenticate,
  authorize(UserRole.ADMIN),
  bulkEnrollmentValidation,
  handleAdminValidationErrors,
  bulkEnrollStudentsController
);

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get all system settings or by category
 * @access  Private (Admin only)
 * @query   { category? }
 */
router.get('/settings', authenticate, authorize(UserRole.ADMIN), getSettings);

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs with filters
 * @access  Private (Admin only)
 * @query   { adminId?, action?, targetUserId?, startDate?, endDate?, limit? }
 */
router.get(
  '/audit-logs',
  authenticate,
  authorize(UserRole.ADMIN),
  auditLogQueryValidation,
  handleAdminValidationErrors,
  getAuditLogsController
);

/**
 * @route   GET /api/v1/admin/audit-logs/my
 * @desc    Get audit logs for current admin
 * @access  Private (Admin only)
 * @query   { action?, startDate?, endDate?, limit? }
 */
router.get(
  '/audit-logs/my',
  authenticate,
  authorize(UserRole.ADMIN),
  auditLogQueryValidation,
  handleAdminValidationErrors,
  getMyAuditLogs
);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create a new user (admin operation)
 * @access  Private (Admin only)
 * @body    { email, password, role, profile: { firstName, lastName, phone? }, isActive? }
 */
router.post(
  '/users',
  authenticate,
  authorize(UserRole.ADMIN),
  createUserValidation,
  handleAdminValidationErrors,
  createUser
);

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with filters and pagination
 * @access  Private (Admin only)
 * @query   { role?, isActive?, search?, page?, limit? }
 */
router.get(
  '/users',
  authenticate,
  authorize(UserRole.ADMIN),
  userQueryValidation,
  handleAdminValidationErrors,
  listAllUsers
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get a single user by ID
 * @access  Private (Admin only)
 */
router.get(
  '/users/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  userIdParamValidation,
  handleAdminValidationErrors,
  getUserById
);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update a user (admin operation)
 * @access  Private (Admin only)
 * @body    { email?, role?, profile?, isActive? }
 */
router.put(
  '/users/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  userIdParamValidation,
  updateUserValidation,
  handleAdminValidationErrors,
  updateUser
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete a user (hard delete, use with caution)
 * @access  Private (Admin only)
 */
router.delete(
  '/users/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  userIdParamValidation,
  handleAdminValidationErrors,
  deleteUser
);

/**
 * @route   PATCH /api/v1/admin/users/:id/role
 * @desc    Assign a role to a user
 * @access  Private (Admin only)
 * @body    { role }
 */
router.patch(
  '/users/:id/role',
  authenticate,
  authorize(UserRole.ADMIN),
  userIdParamValidation,
  assignRoleValidation,
  handleAdminValidationErrors,
  assignUserRole
);

/**
 * @route   PATCH /api/v1/admin/users/:id/activate
 * @desc    Activate a user account
 * @access  Private (Admin only)
 */
router.patch(
  '/users/:id/activate',
  authenticate,
  authorize(UserRole.ADMIN),
  userIdParamValidation,
  handleAdminValidationErrors,
  activateUser
);

/**
 * @route   PATCH /api/v1/admin/users/:id/deactivate
 * @desc    Deactivate a user account (soft delete)
 * @access  Private (Admin only)
 */
router.patch(
  '/users/:id/deactivate',
  authenticate,
  authorize(UserRole.ADMIN),
  userIdParamValidation,
  handleAdminValidationErrors,
  deactivateUser
);

/**
 * @route   PUT /api/v1/admin/settings/:key
 * @desc    Update a system setting
 * @access  Private (Admin only)
 * @body    { value }
 */
router.put(
  '/settings/:key',
  authenticate,
  authorize(UserRole.ADMIN),
  settingKeyParamValidation,
  updateSettingValidation,
  handleAdminValidationErrors,
  updateSetting
);

/**
 * @route   DELETE /api/v1/admin/settings/:key
 * @desc    Delete a system setting
 * @access  Private (Admin only)
 */
router.delete(
  '/settings/:key',
  authenticate,
  authorize(UserRole.ADMIN),
  settingKeyParamValidation,
  handleAdminValidationErrors,
  deleteSetting
);

export default router;

