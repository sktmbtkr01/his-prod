/**
 * Clinical Coding Middleware
 * Checks if clinical coding is required before allowing billing/coding operations
 */

const SystemSettings = require('../models/SystemSettings');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware to check if clinical coding is enabled
 * Use this to block or allow routes based on the setting
 */
const checkClinicalCodingEnabled = asyncHandler(async (req, res, next) => {
    const settings = await SystemSettings.getSettings();

    if (!settings.clinicalCoding.enabled) {
        return res.status(403).json({
            success: false,
            error: 'Clinical coding is disabled by admin',
            codingDisabled: true,
        });
    }

    next();
});

/**
 * Middleware to attach clinical coding status to request
 * Use this for routes that need to know the status but shouldn't be blocked
 */
const attachCodingStatus = asyncHandler(async (req, res, next) => {
    const settings = await SystemSettings.getSettings();
    req.clinicalCodingEnabled = settings.clinicalCoding.enabled;
    next();
});

/**
 * Helper function to check clinical coding status (for use in controllers)
 */
const isClinicalCodingEnabled = async () => {
    const settings = await SystemSettings.getSettings();
    return settings.clinicalCoding.enabled;
};

module.exports = {
    checkClinicalCodingEnabled,
    attachCodingStatus,
    isClinicalCodingEnabled,
};
