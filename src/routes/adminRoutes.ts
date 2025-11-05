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
 * @swagger
 * /api/v1/admin/users/stats:
 *   get:
 *     summary: Get user statistics (total, by role, active/inactive, recent)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/users/stats', authenticate, authorize(UserRole.ADMIN), getUserStats);

/**
 * @swagger
 * /api/v1/admin/bulk/import-users:
 *   post:
 *     summary: Bulk import users (max 100 per request)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkImportUsersRequest'
 *     responses:
 *       200:
 *         description: Bulk import results (partial success supported)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
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
 * @swagger
 * /api/v1/admin/bulk/enroll-students:
 *   post:
 *     summary: Bulk enroll students in a course (max 100 per request)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, studentIds]
 *             properties:
 *               courseId:
 *                 type: string
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Bulk enrollment results
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
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
 * @swagger
 * /api/v1/admin/settings:
 *   get:
 *     summary: Get all system settings or by category
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: System settings
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/settings', authenticate, authorize(UserRole.ADMIN), getSettings);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs with filters
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: targetUserId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
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
 * @swagger
 * /api/v1/admin/audit-logs/my:
 *   get:
 *     summary: Get audit logs for current admin
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Current admin's audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
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
 * @swagger
 * /api/v1/admin/users:
 *   post:
 *     summary: Create a new user (admin operation)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role, profile]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [admin, manager, teacher, coordinator, student]
 *               profile:
 *                 type: object
 *                 required: [firstName, lastName]
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   phone:
 *                     type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
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
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users with filters and pagination
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, teacher, coordinator, student]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
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
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
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
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     summary: Update a user (admin operation)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, manager, teacher, coordinator, student]
 *               profile:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
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
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete a user (hard delete, use with caution)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
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
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     summary: Assign a role to a user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, manager, teacher, coordinator, student]
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
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
 * @swagger
 * /api/v1/admin/users/{id}/activate:
 *   patch:
 *     summary: Activate a user account
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
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
 * @swagger
 * /api/v1/admin/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user account (soft delete)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
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
 * @swagger
 * /api/v1/admin/settings/{key}:
 *   put:
 *     summary: Update a system setting
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: boolean
 *                   - type: object
 *     responses:
 *       200:
 *         description: Setting updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Setting not found
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
 * @swagger
 * /api/v1/admin/settings/{key}:
 *   delete:
 *     summary: Delete a system setting
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Setting deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Setting not found
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

