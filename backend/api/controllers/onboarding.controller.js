/**
 * Onboarding Controller
 * Handles admin-controlled staff onboarding operations
 * 
 * Routes are split between:
 * - Admin routes (generate IDs, approve users)
 * - Public routes (validate ID, signup)
 */

const onboardingService = require('../services/onboarding.service');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES - Onboarding ID Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Generate a new onboarding ID
 * @route   POST /api/v1/admin/onboarding/generate
 * @access  Admin only
 */
exports.generateOnboardingId = asyncHandler(async (req, res, next) => {
    const { role, department, ward, expiresAt, notes } = req.body;

    if (!role) {
        return next(new ErrorResponse('Role is required', 400));
    }

    const onboardingId = await onboardingService.generateOnboardingId(
        { role, department, ward, expiresAt, notes },
        req.user._id
    );

    res.status(201).json({
        success: true,
        message: 'Onboarding ID generated successfully',
        data: onboardingId,
    });
});

/**
 * @desc    Bulk generate onboarding IDs
 * @route   POST /api/v1/admin/onboarding/generate-bulk
 * @access  Admin only
 */
exports.bulkGenerateOnboardingIds = asyncHandler(async (req, res, next) => {
    const { role, department, ward, expiresAt, count, notes } = req.body;

    if (!role) {
        return next(new ErrorResponse('Role is required', 400));
    }

    if (!count || count < 1) {
        return next(new ErrorResponse('Count must be at least 1', 400));
    }

    if (count > 50) {
        return next(new ErrorResponse('Maximum 50 IDs can be generated at once', 400));
    }

    const onboardingIds = await onboardingService.bulkGenerateOnboardingIds(
        { role, department, ward, expiresAt, count, notes },
        req.user._id
    );

    res.status(201).json({
        success: true,
        message: `${onboardingIds.length} onboarding IDs generated successfully`,
        data: onboardingIds,
    });
});

/**
 * @desc    Get all onboarding IDs with filters
 * @route   GET /api/v1/admin/onboarding
 * @access  Admin only
 */
exports.getOnboardingIds = asyncHandler(async (req, res, next) => {
    const { status, role, page = 1, limit = 20 } = req.query;

    const { onboardingIds, total } = await onboardingService.getOnboardingIds({
        status,
        role,
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        count: onboardingIds.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: onboardingIds,
    });
});

/**
 * @desc    Revoke an onboarding ID
 * @route   POST /api/v1/admin/onboarding/:id/revoke
 * @access  Admin only
 */
exports.revokeOnboardingId = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Revocation reason is required', 400));
    }

    const onboardingId = await onboardingService.revokeOnboardingId(
        req.params.id,
        req.user._id,
        reason
    );

    res.status(200).json({
        success: true,
        message: 'Onboarding ID revoked successfully',
        data: onboardingId,
    });
});

/**
 * @desc    Get onboarding statistics for dashboard
 * @route   GET /api/v1/admin/onboarding/stats
 * @access  Admin only
 */
exports.getOnboardingStats = asyncHandler(async (req, res, next) => {
    const stats = await onboardingService.getOnboardingStats();

    res.status(200).json({
        success: true,
        data: stats,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES - User Approval Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get users pending approval
 * @route   GET /api/v1/admin/onboarding/pending-approvals
 * @access  Admin only
 */
exports.getPendingApprovals = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;

    const { users, total } = await onboardingService.getPendingApprovalUsers({
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        count: users.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: users,
    });
});

/**
 * @desc    Approve a pending user
 * @route   POST /api/v1/admin/onboarding/approve/:userId
 * @access  Admin only
 */
exports.approveUser = asyncHandler(async (req, res, next) => {
    const user = await onboardingService.approveUser(req.params.userId, req.user._id);

    res.status(200).json({
        success: true,
        message: `User ${user.username} has been approved`,
        data: user,
    });
});

/**
 * @desc    Reject a pending user
 * @route   POST /api/v1/admin/onboarding/reject/:userId
 * @access  Admin only
 */
exports.rejectUser = asyncHandler(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
        return next(new ErrorResponse('Rejection reason is required', 400));
    }

    const user = await onboardingService.rejectUser(req.params.userId, req.user._id, reason);

    res.status(200).json({
        success: true,
        message: `User ${user.username} has been rejected`,
        data: user,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES - Onboarding Flow
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Validate an onboarding ID (first step of signup)
 * @route   POST /api/v1/auth/validate-onboarding-id
 * @access  Public
 */
exports.validateOnboardingId = asyncHandler(async (req, res, next) => {
    const { onboardingCode } = req.body;

    if (!onboardingCode) {
        return next(new ErrorResponse('Onboarding ID is required', 400));
    }

    const validation = await onboardingService.validateOnboardingId(onboardingCode);

    if (!validation.valid) {
        return next(new ErrorResponse(validation.error, 400));
    }

    res.status(200).json({
        success: true,
        message: 'Onboarding ID is valid',
        data: {
            role: validation.role,
            department: validation.department,
            ward: validation.ward,
        },
    });
});

/**
 * @desc    Create account using onboarding ID
 * @route   POST /api/v1/auth/signup-with-onboarding
 * @access  Public
 */
exports.signupWithOnboarding = asyncHandler(async (req, res, next) => {
    const {
        onboardingCode,
        username,
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        phone,
        gender,
        age,
    } = req.body;

    // Validation
    if (!onboardingCode) {
        return next(new ErrorResponse('Onboarding ID is required', 400));
    }

    if (!username || username.length < 3) {
        return next(new ErrorResponse('Username must be at least 3 characters', 400));
    }

    if (!email) {
        return next(new ErrorResponse('Email is required', 400));
    }

    if (!password || password.length < 6) {
        return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    if (password !== confirmPassword) {
        return next(new ErrorResponse('Passwords do not match', 400));
    }

    if (!firstName || !lastName) {
        return next(new ErrorResponse('First name and last name are required', 400));
    }

    // Validate onboarding ID first
    const validation = await onboardingService.validateOnboardingId(onboardingCode);

    if (!validation.valid) {
        return next(new ErrorResponse(validation.error, 400));
    }

    // Create user
    const user = await onboardingService.createUserFromOnboarding(
        {
            username,
            email,
            password,
            firstName,
            lastName,
            phone,
            gender,
            age,
            department: validation.department?._id,
        },
        onboardingCode
    );

    res.status(201).json({
        success: true,
        message: 'Account created successfully. Please wait for administrator approval.',
        data: {
            username: user.username,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus,
        },
    });
});

module.exports = exports;
