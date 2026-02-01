/**
 * Onboarding Routes
 * Admin routes for onboarding ID management and user approvals
 * 
 * Base path: /api/v1/admin/onboarding
 */

const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboarding.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING ID MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/admin/onboarding/stats
 * @desc    Get onboarding statistics for dashboard
 * @access  Admin only
 */
router.get('/stats', onboardingController.getOnboardingStats);

/**
 * @route   GET /api/v1/admin/onboarding
 * @desc    Get all onboarding IDs with filters
 * @access  Admin only
 */
router.get('/', onboardingController.getOnboardingIds);

/**
 * @route   POST /api/v1/admin/onboarding/generate
 * @desc    Generate a new onboarding ID
 * @access  Admin only
 */
router.post('/generate', onboardingController.generateOnboardingId);

/**
 * @route   POST /api/v1/admin/onboarding/generate-bulk
 * @desc    Bulk generate onboarding IDs
 * @access  Admin only
 */
router.post('/generate-bulk', onboardingController.bulkGenerateOnboardingIds);

/**
 * @route   POST /api/v1/admin/onboarding/:id/revoke
 * @desc    Revoke an onboarding ID
 * @access  Admin only
 */
router.post('/:id/revoke', onboardingController.revokeOnboardingId);

// ═══════════════════════════════════════════════════════════════════════════════
// USER APPROVAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/admin/onboarding/pending-approvals
 * @desc    Get users pending approval
 * @access  Admin only
 */
router.get('/pending-approvals', onboardingController.getPendingApprovals);

/**
 * @route   POST /api/v1/admin/onboarding/approve/:userId
 * @desc    Approve a pending user
 * @access  Admin only
 */
router.post('/approve/:userId', onboardingController.approveUser);

/**
 * @route   POST /api/v1/admin/onboarding/reject/:userId
 * @desc    Reject a pending user
 * @access  Admin only
 */
router.post('/reject/:userId', onboardingController.rejectUser);

module.exports = router;
