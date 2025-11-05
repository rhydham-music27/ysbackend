import { Router } from 'express';
import passport from '../config/passport';
import {
  getCurrentUser,
  login,
  logout,
  refreshToken,
  register,
  googleOAuthCallback,
  googleOAuthFailure,
  googleOAuthInitiate,
  uploadProfileAvatar,
  deleteProfileAvatar,
  updateProfile,
} from '../controllers/authController';
import authenticate from '../middlewares/auth';
import authorize, { authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import { uploadSingleImage } from '../middlewares/upload';
import {
  handleValidationErrors,
  loginValidation,
  refreshTokenValidation,
  registerValidation,
  updateProfileValidation,
} from '../validators/authValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists
 */
router.post('/register', registerValidation, handleValidationErrors, register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate a user and return token pair
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 */
router.post('/login', loginValidation, handleValidationErrors, login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using a valid refresh token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', refreshTokenValidation, handleValidationErrors, refreshToken);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Initiate Google OAuth 2.0 authentication flow
 * @access  Public
 * @returns Redirects to Google OAuth consent screen
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth callback handler - exchanges code for user info and generates JWT tokens
 * @access  Public (called by Google OAuth)
 * @returns { success, message, data: { user, accessToken, refreshToken } } or redirects to frontend
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth/google/failure' }),
  googleOAuthCallback
);

/**
 * @route   GET /api/v1/auth/google/failure
 * @desc    Handle Google OAuth authentication failures
 * @access  Public
 * @returns { success: false, message: 'Google authentication failed' }
 */
router.get('/google/failure', googleOAuthFailure);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout current user and clear refresh token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Update user profile (text fields only)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticate, updateProfileValidation, handleValidationErrors, updateProfile);

/**
 * @swagger
 * /api/v1/auth/profile/avatar:
 *   post:
 *     summary: Upload or update profile avatar
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: No file or invalid file type
 *       500:
 *         description: Upload failed
 */
router.post('/profile/avatar', authenticate, uploadSingleImage('avatar'), uploadProfileAvatar);

/**
 * @swagger
 * /api/v1/auth/profile/avatar:
 *   delete:
 *     summary: Delete profile avatar
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       401:
 *         description: Unauthorized
 */
router.delete('/profile/avatar', authenticate, deleteProfileAvatar);

/**
 * @route   GET /api/v1/auth/admin/test
 * @desc    RBAC demo route - admin only access
 * @access  Private (Admin only)
 * @returns { success, message, user }
 */
router.get('/admin/test', authenticate, authorize(UserRole.ADMIN), (req, res) => {
  return res.json({ success: true, message: 'Admin access granted', user: (req as any).user });
});

/**
 * @route   GET /api/v1/auth/staff/test
 * @desc    RBAC demo route - minimum TEACHER level (TEACHER, COORDINATOR, MANAGER, ADMIN)
 * @access  Private (Teacher+)
 * @returns { success, message, role }
 */
router.get('/staff/test', authenticate, authorizeMinRole(UserRole.TEACHER), (req, res) => {
  const role = (req as any).user?.role;
  return res.json({ success: true, message: 'Staff access granted', role });
});

export default router;


