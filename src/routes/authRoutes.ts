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
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, profile: { firstName, lastName, phone? }, role? }
 * @returns { success, message, data: { user, accessToken, refreshToken } }
 */
router.post('/register', registerValidation, handleValidationErrors, register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate a user and return token pair
 * @access  Public
 * @body    { email, password }
 * @returns { success, message, data: { user, accessToken, refreshToken } }
 */
router.post('/login', loginValidation, handleValidationErrors, login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using a valid refresh token
 * @access  Public
 * @body    { refreshToken }
 * @returns { success, message, data: { accessToken, refreshToken } }
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
 * @route   POST /api/v1/auth/logout
 * @desc    Logout current user and clear refresh token
 * @access  Private (Bearer token required)
 * @returns { success, message }
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private (Bearer token required)
 * @returns { success, data: { user } }
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile (text fields only)
 * @access  Private (All authenticated users)
 * @body    { firstName?, lastName?, phone?, dateOfBirth?, address? }
 */
router.put('/profile', authenticate, updateProfileValidation, handleValidationErrors, updateProfile);

/**
 * @route   POST /api/v1/auth/profile/avatar
 * @desc    Upload or update profile avatar
 * @access  Private (All authenticated users)
 * @body    multipart/form-data with 'avatar' field (image file, max 5MB)
 */
router.post('/profile/avatar', authenticate, uploadSingleImage('avatar'), uploadProfileAvatar);

/**
 * @route   DELETE /api/v1/auth/profile/avatar
 * @desc    Delete profile avatar
 * @access  Private (All authenticated users)
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


