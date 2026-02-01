/**
 * Onboarding Service
 * Business logic for admin-controlled staff onboarding
 * 
 * Security Principles:
 * - Only admin can generate onboarding IDs
 * - Roles are pre-assigned and immutable by users
 * - All actions are audit-logged
 * - IDs are cryptographically random
 */

const OnboardingId = require('../models/OnboardingId');
const User = require('../models/User');
const { createAuditLog } = require('./audit.service');

/**
 * Generate a new onboarding ID
 * @param {Object} data - Onboarding ID data
 * @param {String} adminId - Admin user ID
 * @returns {Object} Created onboarding ID
 */
const generateOnboardingId = async (data, adminId) => {
    const { role, department, ward, expiresAt, notes } = data;

    // Generate cryptographically secure code
    const onboardingCode = OnboardingId.generateSecureCode();

    const onboardingId = await OnboardingId.create({
        onboardingCode,
        role,
        department: department || null,
        ward: ward || null,
        expiresAt: expiresAt || null,
        notes: notes || '',
        createdBy: adminId,
        status: 'ACTIVE',
    });

    // Audit log
    await createAuditLog({
        user: adminId,
        action: 'create',
        entity: 'OnboardingId',
        entityId: onboardingId._id,
        description: `Admin generated onboarding ID ${onboardingCode} for role: ${role}`,
        metadata: {
            onboardingCode,
            role,
            department,
            expiresAt,
        },
    });

    return onboardingId;
};

/**
 * Bulk generate onboarding IDs
 * @param {Object} data - Bulk generation data
 * @param {String} adminId - Admin user ID
 * @returns {Array} Created onboarding IDs
 */
const bulkGenerateOnboardingIds = async (data, adminId) => {
    const { role, department, ward, expiresAt, count, notes } = data;

    const onboardingIds = [];

    for (let i = 0; i < Math.min(count, 50); i++) { // Max 50 at a time
        const onboardingCode = OnboardingId.generateSecureCode();

        const onboardingId = await OnboardingId.create({
            onboardingCode,
            role,
            department: department || null,
            ward: ward || null,
            expiresAt: expiresAt || null,
            notes: notes || `Bulk generated - ${i + 1}/${count}`,
            createdBy: adminId,
            status: 'ACTIVE',
        });

        onboardingIds.push(onboardingId);
    }

    // Audit log
    await createAuditLog({
        user: adminId,
        action: 'create',
        entity: 'OnboardingId',
        description: `Admin bulk generated ${onboardingIds.length} onboarding IDs for role: ${role}`,
        metadata: {
            count: onboardingIds.length,
            role,
            department,
            expiresAt,
        },
    });

    return onboardingIds;
};

/**
 * Validate an onboarding ID for signup
 * @param {String} code - Onboarding ID code
 * @returns {Object} Validation result with role info
 */
const validateOnboardingId = async (code) => {
    const normalizedCode = code.trim().toUpperCase();

    const onboardingId = await OnboardingId.findOne({ onboardingCode: normalizedCode })
        .populate('department', 'name departmentCode')
        .populate('ward', 'name wardCode');

    if (!onboardingId) {
        return {
            valid: false,
            error: 'Invalid onboarding ID. Please check and try again.',
        };
    }

    // Check if already used
    if (onboardingId.status === 'USED') {
        return {
            valid: false,
            error: 'This onboarding ID has already been used.',
        };
    }

    // Check if expired
    if (onboardingId.status === 'EXPIRED') {
        return {
            valid: false,
            error: 'This onboarding ID has expired. Please contact the administrator.',
        };
    }

    // Check if revoked
    if (onboardingId.status === 'REVOKED') {
        return {
            valid: false,
            error: 'This onboarding ID has been revoked. Please contact the administrator.',
        };
    }

    // Check expiry date
    if (onboardingId.expiresAt && new Date() > onboardingId.expiresAt) {
        // Update status to expired
        onboardingId.status = 'EXPIRED';
        await onboardingId.save();

        return {
            valid: false,
            error: 'This onboarding ID has expired. Please contact the administrator.',
        };
    }

    return {
        valid: true,
        onboardingId: onboardingId._id,
        role: onboardingId.role,
        department: onboardingId.department,
        ward: onboardingId.ward,
    };
};

/**
 * Create a new user via onboarding flow
 * @param {Object} userData - User registration data
 * @param {String} onboardingCode - The onboarding ID code used
 * @returns {Object} Created user (pending approval)
 */
const createUserFromOnboarding = async (userData, onboardingCode) => {
    const normalizedCode = onboardingCode.trim().toUpperCase();

    // Re-validate the onboarding ID
    const onboardingId = await OnboardingId.findOne({ onboardingCode: normalizedCode });

    if (!onboardingId || !onboardingId.isValid()) {
        throw new Error('Invalid or expired onboarding ID');
    }

    // Create user with PENDING_APPROVAL status
    const user = await User.create({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: onboardingId.role, // Role comes from onboarding ID, not user input!
        department: onboardingId.department || userData.department,
        profile: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || '',
            dateOfJoining: new Date(),
        },
        isActive: false, // Not active until approved
        accountStatus: 'pending_approval', // New status for approval flow
    });

    // Mark onboarding ID as used
    onboardingId.status = 'USED';
    onboardingId.usedAt = new Date();
    onboardingId.usedBy = user._id;
    await onboardingId.save();

    // Audit log - onboarding ID usage
    await createAuditLog({
        user: user._id,
        action: 'create',
        entity: 'User',
        entityId: user._id,
        description: `New user ${user.username} signed up using onboarding ID ${normalizedCode}. Status: PENDING_APPROVAL`,
        metadata: {
            onboardingIdCode: normalizedCode,
            role: onboardingId.role,
            accountStatus: 'pending_approval',
        },
    });

    return user;
};

/**
 * Get all onboarding IDs with filters
 * @param {Object} filters - Filter options
 * @returns {Object} Paginated onboarding IDs
 */
const getOnboardingIds = async (filters = {}) => {
    const { status, role, page = 1, limit = 20 } = filters;

    const query = {};

    if (status) {
        query.status = status;
    }

    if (role) {
        query.role = role;
    }

    const skip = (page - 1) * limit;

    const [onboardingIds, total] = await Promise.all([
        OnboardingId.find(query)
            .populate('createdBy', 'username profile.firstName profile.lastName')
            .populate('usedBy', 'username profile.firstName profile.lastName email')
            .populate('department', 'name')
            .populate('ward', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        OnboardingId.countDocuments(query),
    ]);

    return { onboardingIds, total };
};

/**
 * Revoke an onboarding ID
 * @param {String} onboardingIdId - OnboardingId document ID
 * @param {String} adminId - Admin user ID
 * @param {String} reason - Reason for revocation
 * @returns {Object} Updated onboarding ID
 */
const revokeOnboardingId = async (onboardingIdId, adminId, reason) => {
    const onboardingId = await OnboardingId.findById(onboardingIdId);

    if (!onboardingId) {
        throw new Error('Onboarding ID not found');
    }

    if (onboardingId.status === 'USED') {
        throw new Error('Cannot revoke an already used onboarding ID');
    }

    onboardingId.status = 'REVOKED';
    onboardingId.notes = `${onboardingId.notes || ''}\nRevoked by admin: ${reason}`;
    await onboardingId.save();

    // Audit log
    await createAuditLog({
        user: adminId,
        action: 'update',
        entity: 'OnboardingId',
        entityId: onboardingId._id,
        description: `Admin revoked onboarding ID ${onboardingId.onboardingCode}. Reason: ${reason}`,
    });

    return onboardingId;
};

/**
 * Get pending approval users
 * @param {Object} filters - Filter options
 * @returns {Object} Paginated pending users
 */
const getPendingApprovalUsers = async (filters = {}) => {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const query = {
        accountStatus: 'pending_approval',
    };

    const [users, total] = await Promise.all([
        User.find(query)
            .populate('department', 'name')
            .select('-password -refreshToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments(query),
    ]);

    return { users, total };
};

/**
 * Approve a pending user
 * @param {String} userId - User ID
 * @param {String} adminId - Admin user ID
 * @returns {Object} Updated user
 */
const approveUser = async (userId, adminId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (user.accountStatus !== 'pending_approval') {
        throw new Error('User is not pending approval');
    }

    user.accountStatus = 'active';
    user.isActive = true;
    await user.save();

    // Audit log
    await createAuditLog({
        user: adminId,
        action: 'update',
        entity: 'User',
        entityId: user._id,
        description: `Admin approved user ${user.username} (${user.email}). Role: ${user.role}`,
        metadata: {
            previousStatus: 'pending_approval',
            newStatus: 'active',
            role: user.role,
        },
    });

    return user;
};

/**
 * Reject a pending user
 * @param {String} userId - User ID
 * @param {String} adminId - Admin user ID
 * @param {String} reason - Rejection reason
 * @returns {Object} Updated user
 */
const rejectUser = async (userId, adminId, reason) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (user.accountStatus !== 'pending_approval') {
        throw new Error('User is not pending approval');
    }

    // Find the onboarding ID used by this user and optionally reactivate it
    const onboardingId = await OnboardingId.findOne({ usedBy: user._id });

    user.accountStatus = 'deactivated';
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivatedBy = adminId;
    user.deactivationReason = reason;
    await user.save();

    // Audit log
    await createAuditLog({
        user: adminId,
        action: 'update',
        entity: 'User',
        entityId: user._id,
        description: `Admin rejected user ${user.username} (${user.email}). Reason: ${reason}`,
        metadata: {
            previousStatus: 'pending_approval',
            newStatus: 'deactivated',
            reason,
        },
    });

    return user;
};

/**
 * Get onboarding statistics for dashboard
 * @returns {Object} Statistics
 */
const getOnboardingStats = async () => {
    const [
        totalActive,
        totalUsed,
        totalExpired,
        totalRevoked,
        pendingApprovals,
        recentSignups,
    ] = await Promise.all([
        OnboardingId.countDocuments({ status: 'ACTIVE' }),
        OnboardingId.countDocuments({ status: 'USED' }),
        OnboardingId.countDocuments({ status: 'EXPIRED' }),
        OnboardingId.countDocuments({ status: 'REVOKED' }),
        User.countDocuments({ accountStatus: 'pending_approval' }),
        User.find({ accountStatus: 'pending_approval' })
            .select('username email role createdAt profile')
            .sort({ createdAt: -1 })
            .limit(5),
    ]);

    return {
        onboardingIds: {
            active: totalActive,
            used: totalUsed,
            expired: totalExpired,
            revoked: totalRevoked,
            total: totalActive + totalUsed + totalExpired + totalRevoked,
        },
        pendingApprovals,
        recentSignups,
    };
};

module.exports = {
    generateOnboardingId,
    bulkGenerateOnboardingIds,
    validateOnboardingId,
    createUserFromOnboarding,
    getOnboardingIds,
    revokeOnboardingId,
    getPendingApprovalUsers,
    approveUser,
    rejectUser,
    getOnboardingStats,
};
