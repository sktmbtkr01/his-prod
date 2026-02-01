const mongoose = require('mongoose');

/**
 * RiskScoreHistory Model
 * Tracks every change to OPD risk scores
 */

const riskScoreHistorySchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: true,
        },
        encounter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true,
        },
        source: {
            type: String,
            enum: ['VITALS', 'LAB_RISK', 'RADIOLOGY_RISK'],
            required: true,
        },
        oldFinalRiskScore: {
            type: Number,
            default: 0,
        },
        newFinalRiskScore: {
            type: Number,
            required: true,
        },
        oldCategory: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH'],
        },
        newCategory: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            required: true,
        },
        // For LAB_RISK / RADIOLOGY_RISK sources
        selectedRiskLevel: {
            type: String,
            enum: ['NORMAL', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL'],
        },
        deltaApplied: {
            type: Number,
            min: 0,
            max: 4,
        },
        // For VITALS source
        news2Points: {
            type: Number,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
riskScoreHistorySchema.index({ patient: 1, createdAt: -1 });
riskScoreHistorySchema.index({ encounter: 1, createdAt: -1 });

const RiskScoreHistory = mongoose.model('RiskScoreHistory', riskScoreHistorySchema);

module.exports = RiskScoreHistory;
