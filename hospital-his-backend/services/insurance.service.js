const Insurance = require('../models/Insurance');
const InsuranceProvider = require('../models/InsuranceProvider');
const { INSURANCE_STATUS } = require('../config/constants');

/**
 * Insurance Service
 * Handles insurance processing and claims
 */

class InsuranceService {
    /**
     * Generate claim number
     */
    async generateClaimNumber() {
        const today = new Date();
        const prefix = `CLM${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

        const lastClaim = await Insurance.findOne({ claimNumber: { $regex: `^${prefix}` } })
            .sort({ createdAt: -1 });

        const sequence = lastClaim
            ? parseInt(lastClaim.claimNumber.slice(-6), 10) + 1
            : 1;

        return `${prefix}${String(sequence).padStart(6, '0')}`;
    }

    /**
     * Verify patient insurance
     */
    async verifyInsurance(patientId, providerId, policyNumber) {
        const provider = await InsuranceProvider.findById(providerId);
        if (!provider || !provider.isActive) {
            return { valid: false, message: 'Insurance provider not found or inactive' };
        }

        // TODO: Integrate with actual insurance verification API
        return {
            valid: true,
            provider,
            policyNumber,
            coverageDetails: {
                maxCoverage: 500000,
                usedAmount: 0,
                remainingAmount: 500000,
            },
        };
    }

    /**
     * Submit insurance claim
     */
    async submitClaim(claimData) {
        const claimNumber = await this.generateClaimNumber();

        const claim = await Insurance.create({
            ...claimData,
            claimNumber,
            status: INSURANCE_STATUS.SUBMITTED,
            submittedDate: new Date(),
        });

        // TODO: Integrate with insurance provider API
        return claim;
    }

    /**
     * Calculate co-pay amount
     */
    async calculateCoPay(providerId, totalAmount, serviceType) {
        const provider = await InsuranceProvider.findById(providerId);
        if (!provider) return totalAmount;

        // Check co-pay rate from provider settings
        const coPayPercent = provider.coPayPercentage || 20;
        const coPayAmount = (totalAmount * coPayPercent) / 100;

        return {
            totalAmount,
            coPayPercent,
            coPayAmount: Math.round(coPayAmount * 100) / 100,
            insuranceAmount: Math.round((totalAmount - coPayAmount) * 100) / 100,
        };
    }

    /**
     * Pre-authorization request
     */
    async requestPreAuth(patientId, providerId, treatmentDetails, estimatedCost) {
        const claimNumber = await this.generateClaimNumber();

        const preAuth = await Insurance.create({
            claimNumber,
            patient: patientId,
            provider: providerId,
            claimAmount: estimatedCost,
            treatmentDetails,
            status: INSURANCE_STATUS.PRE_AUTH_PENDING,
            submittedDate: new Date(),
        });

        // TODO: Send to insurance provider API
        return preAuth;
    }

    /**
     * Update claim status
     */
    async updateClaimStatus(claimId, status, approvedAmount, rejectionReason) {
        const claim = await Insurance.findById(claimId);
        if (!claim) throw new Error('Claim not found');

        claim.status = status;
        if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
        if (rejectionReason) claim.rejectionReason = rejectionReason;

        if (status === INSURANCE_STATUS.APPROVED) {
            claim.approvedDate = new Date();
        } else if (status === INSURANCE_STATUS.SETTLED) {
            claim.settlementDate = new Date();
        }

        return claim.save();
    }

    /**
     * Get claims summary
     */
    async getClaimsSummary(startDate, endDate) {
        const summary = await Insurance.aggregate([
            {
                $match: {
                    submittedDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$claimAmount' },
                    approvedAmount: { $sum: '$approvedAmount' },
                },
            },
        ]);

        return summary;
    }

    /**
     * Get provider-wise claim statistics
     */
    async getProviderStats(startDate, endDate) {
        return Insurance.aggregate([
            {
                $match: {
                    submittedDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$provider',
                    totalClaims: { $sum: 1 },
                    totalAmount: { $sum: '$claimAmount' },
                    approvedAmount: { $sum: '$approvedAmount' },
                    settledClaims: {
                        $sum: { $cond: [{ $eq: ['$status', INSURANCE_STATUS.SETTLED] }, 1, 0] },
                    },
                },
            },
            {
                $lookup: {
                    from: 'insuranceproviders',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'providerInfo',
                },
            },
            {
                $unwind: '$providerInfo',
            },
            {
                $project: {
                    providerName: '$providerInfo.name',
                    totalClaims: 1,
                    totalAmount: 1,
                    approvedAmount: 1,
                    settledClaims: 1,
                },
            },
        ]);
    }
}

module.exports = new InsuranceService();
