const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettings.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/system-settings/clinical-coding-status
 * @desc    Get clinical coding enabled/disabled status (for UI)
 * @access  All authenticated users
 */
router.get('/clinical-coding-status', systemSettingsController.getClinicalCodingStatus);

/**
 * @route   GET /api/v1/system-settings
 * @desc    Get all system settings
 * @access  Admin only
 */
router.get('/', authorize('admin'), systemSettingsController.getSettings);

/**
 * @route   PUT /api/v1/system-settings/clinical-coding
 * @desc    Toggle clinical coding requirement
 * @access  Admin only
 */
router.put('/clinical-coding', authorize('admin'), systemSettingsController.toggleClinicalCoding);

/**
 * @route   PUT /api/v1/system-settings/clinical-coding/force
 * @desc    Force toggle clinical coding (after confirmation)
 * @access  Admin only
 */
router.put('/clinical-coding/force', authorize('admin'), systemSettingsController.forceToggleClinicalCoding);

/**
 * @route   GET /api/v1/system-settings/audit-log
 * @desc    Get settings change audit log
 * @access  Admin only
 */
router.get('/audit-log', authorize('admin'), systemSettingsController.getAuditLog);

module.exports = router;
