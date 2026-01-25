const Appointment = require('../models/Appointment');
const RiskScoreHistory = require('../models/RiskScoreHistory');

/**
 * Risk Score Service
 * Centralized calculations and history logging for OPD Risk Scores
 */

// Risk level to delta mapping
const RISK_LEVEL_DELTAS = {
    NORMAL: 0,
    MILD: 1,
    MODERATE: 2,
    SEVERE: 3,
    CRITICAL: 4,
};

/**
 * Get delta value for a risk level
 */
const getRiskDelta = (riskLevel) => {
    return RISK_LEVEL_DELTAS[riskLevel] || 0;
};

/**
 * Calculate final risk score from appointment data
 */
const calculateFinalRiskScore = (news2Points, labDelta, radiologyDelta) => {
    return (news2Points || 0) + (labDelta || 0) + (radiologyDelta || 0);
};

/**
 * Get risk category from final score
 */
const getRiskCategory = (finalScore) => {
    if (finalScore >= 7) return 'HIGH';
    if (finalScore >= 5) return 'MEDIUM';
    return 'LOW';
};

/**
 * Update risk score for an appointment and log history
 * @param {string} appointmentId - Appointment ID
 * @param {string} source - VITALS | LAB_RISK | RADIOLOGY_RISK
 * @param {object} data - Source-specific data
 * @param {string} userId - User making the update
 */
const updateRiskScore = async (appointmentId, source, data, userId) => {
    console.log('🔧 [RISK SERVICE] updateRiskScore called');
    console.log('🔧 [RISK SERVICE] appointmentId:', appointmentId);
    console.log('🔧 [RISK SERVICE] source:', source);
    console.log('🔧 [RISK SERVICE] data:', data);
    console.log('🔧 [RISK SERVICE] userId:', userId);

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        console.error('❌ [RISK SERVICE] Appointment not found!');
        throw new Error('Appointment not found');
    }
    console.log('🔧 [RISK SERVICE] Found appointment:', appointment.appointmentNumber);

    // Store old values for history
    const oldFinalRiskScore = appointment.finalRiskScore || 0;
    const oldCategory = appointment.riskCategory || 'LOW';
    console.log('🔧 [RISK SERVICE] Old values - score:', oldFinalRiskScore, 'category:', oldCategory);

    // Update based on source
    let selectedRiskLevel = null;
    let deltaApplied = null;
    let news2PointsRecord = null;

    switch (source) {
        case 'VITALS':
            appointment.news2Points = data.news2Points || 0;
            news2PointsRecord = data.news2Points;
            console.log('🔧 [RISK SERVICE] VITALS source - news2Points:', news2PointsRecord);
            break;

        case 'LAB_RISK':
            selectedRiskLevel = data.riskLevel;
            deltaApplied = getRiskDelta(data.riskLevel);
            appointment.labRiskLevel = data.riskLevel;
            appointment.labDelta = deltaApplied;
            console.log('🔧 [RISK SERVICE] LAB_RISK source - level:', selectedRiskLevel, 'delta:', deltaApplied);
            break;

        case 'RADIOLOGY_RISK':
            selectedRiskLevel = data.riskLevel;
            deltaApplied = getRiskDelta(data.riskLevel);
            appointment.radiologyRiskLevel = data.riskLevel;
            appointment.radiologyDelta = deltaApplied;
            console.log('🔧 [RISK SERVICE] RADIOLOGY_RISK source - level:', selectedRiskLevel, 'delta:', deltaApplied);
            break;

        default:
            throw new Error('Invalid source');
    }

    // Recalculate final score and category
    const newFinalRiskScore = calculateFinalRiskScore(
        appointment.news2Points,
        appointment.labDelta,
        appointment.radiologyDelta
    );
    const newCategory = getRiskCategory(newFinalRiskScore);
    console.log('🔧 [RISK SERVICE] New values - score:', newFinalRiskScore, 'category:', newCategory);

    appointment.finalRiskScore = newFinalRiskScore;
    appointment.riskCategory = newCategory;

    await appointment.save();
    console.log('🔧 [RISK SERVICE] Appointment saved with new risk score');

    // Log to history
    const historyEntry = await RiskScoreHistory.create({
        patient: appointment.patient,
        encounter: appointment._id,
        source,
        oldFinalRiskScore,
        newFinalRiskScore,
        oldCategory,
        newCategory,
        selectedRiskLevel,
        deltaApplied,
        news2Points: news2PointsRecord,
        updatedBy: userId,
    });
    console.log('✅ [RISK SERVICE] RiskScoreHistory entry created:', historyEntry._id);

    return appointment;
};

/**
 * Get risk score history for an appointment
 */
const getRiskScoreHistory = async (appointmentId) => {
    return RiskScoreHistory.find({ encounter: appointmentId })
        .populate('updatedBy', 'profile.firstName profile.lastName')
        .sort({ createdAt: -1 });
};

/**
 * Get risk score history for a patient (all encounters)
 */
const getPatientRiskHistory = async (patientId) => {
    return RiskScoreHistory.find({ patient: patientId })
        .populate('encounter', 'appointmentNumber')
        .populate('updatedBy', 'profile.firstName profile.lastName')
        .sort({ createdAt: -1 })
        .limit(50);
};

module.exports = {
    RISK_LEVEL_DELTAS,
    getRiskDelta,
    calculateFinalRiskScore,
    getRiskCategory,
    updateRiskScore,
    getRiskScoreHistory,
    getPatientRiskHistory,
};
