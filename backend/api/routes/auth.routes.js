const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const onboardingController = require('../controllers/onboarding.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password (logged in user)
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ONBOARDING ROUTES - Staff Signup Flow
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/auth/validate-onboarding-id
 * @desc    Validate an onboarding ID (first step of signup)
 * @access  Public
 */
router.post('/validate-onboarding-id', onboardingController.validateOnboardingId);

/**
 * @route   POST /api/auth/signup-with-onboarding
 * @desc    Create account using onboarding ID
 * @access  Public
 */
router.post('/signup-with-onboarding', onboardingController.signupWithOnboarding);

module.exports = router;
