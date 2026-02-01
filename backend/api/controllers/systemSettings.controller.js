/**
 * System Settings Controller
 * Handles hospital-wide configuration management
 */

const SystemSettings = require('../models/SystemSettings');
const ClinicalCodingRecord = require('../models/ClinicalCodingRecord');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Get all system settings
 * @route   GET /api/v1/system-settings
 * @access  Admin only
 */
exports.getSettings = asyncHandler(async (req, res, next) => {
    const settings = await SystemSettings.getSettings();

    res.status(200).json({
        success: true,
        data: {
            clinicalCoding: settings.clinicalCoding,
        },
    });
});

/**
 * @desc    Get clinical coding status (public for UI decisions)
 * @route   GET /api/v1/system-settings/clinical-coding-status
 * @access  All authenticated users
 */
exports.getClinicalCodingStatus = asyncHandler(async (req, res, next) => {
    const settings = await SystemSettings.getSettings();

    res.status(200).json({
        success: true,
        data: {
            enabled: settings.clinicalCoding.enabled,
        },
    });
});

/**
 * @desc    Toggle clinical coding requirement
 * @route   PUT /api/v1/system-settings/clinical-coding
 * @access  Admin only
 */
exports.toggleClinicalCoding = asyncHandler(async (req, res, next) => {
    const { enabled, reason } = req.body;

    if (typeof enabled !== 'boolean') {
        return next(new ErrorResponse('Please provide enabled as boolean', 400));
    }

    const settings = await SystemSettings.getSettings();
    const previousValue = settings.clinicalCoding.enabled;

    // If disabling, check for in-progress coding records
    if (!enabled && previousValue) {
        const inProgressCount = await ClinicalCodingRecord.countDocuments({
            status: { $in: ['in-progress', 'awaiting-coding'] }
        });

        if (inProgressCount > 0) {
            // Return warning but allow toggle with confirmation
            return res.status(200).json({
                success: true,
                warning: true,
                message: `There are ${inProgressCount} coding records in progress. Disabling will bypass coding for future encounters only.`,
                data: {
                    inProgressCount,
                    requiresConfirmation: true,
                },
            });
        }
    }

    // Update the setting
    await settings.updateSetting(
        'clinicalCoding.enabled',
        enabled,
        req.user.id,
        reason || `Clinical coding ${enabled ? 'enabled' : 'disabled'} by admin`
    );

    logger.info(`[SystemSettings] Clinical Coding toggled: ${previousValue} → ${enabled} by user ${req.user.id}`);

    res.status(200).json({
        success: true,
        message: `Clinical Coding has been ${enabled ? 'enabled' : 'disabled'}`,
        data: {
            clinicalCoding: settings.clinicalCoding,
        },
    });
});

/**
 * @desc    Force toggle clinical coding (after confirmation)
 * @route   PUT /api/v1/system-settings/clinical-coding/force
 * @access  Admin only
 */
exports.forceToggleClinicalCoding = asyncHandler(async (req, res, next) => {
    const { enabled, reason } = req.body;

    if (typeof enabled !== 'boolean') {
        return next(new ErrorResponse('Please provide enabled as boolean', 400));
    }

    const settings = await SystemSettings.getSettings();
    const previousValue = settings.clinicalCoding.enabled;

    // Update the setting without checks
    await settings.updateSetting(
        'clinicalCoding.enabled',
        enabled,
        req.user.id,
        reason || `Clinical coding ${enabled ? 'enabled' : 'disabled'} by admin (force)`
    );

    logger.info(`[SystemSettings] Clinical Coding FORCE toggled: ${previousValue} → ${enabled} by user ${req.user.id}`);

    res.status(200).json({
        success: true,
        message: `Clinical Coding has been ${enabled ? 'enabled' : 'disabled'}`,
        data: {
            clinicalCoding: settings.clinicalCoding,
        },
    });
});

/**
 * @desc    Get audit log for settings
 * @route   GET /api/v1/system-settings/audit-log
 * @access  Admin only
 */
exports.getAuditLog = asyncHandler(async (req, res, next) => {
    const settings = await SystemSettings.getSettings();

    const auditLog = await SystemSettings.findOne({ settingsId: 'HOSPITAL_SETTINGS' })
        .populate('auditLog.changedBy', 'name email role')
        .select('auditLog');

    res.status(200).json({
        success: true,
        data: auditLog?.auditLog?.slice().reverse() || [], // Most recent first
    });
});
