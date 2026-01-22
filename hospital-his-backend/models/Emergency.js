const mongoose = require('mongoose');

/**
 * Emergency Model
 * Represents emergency department cases
 */

const EMERGENCY_STATUS = {
    REGISTERED: 'registered',
    TRIAGE: 'triage',
    IN_TREATMENT: 'in-treatment',
    OBSERVATION: 'observation',
    ADMITTED: 'admitted',
    DISCHARGED: 'discharged',
    TRANSFERRED: 'transferred',
};

const TRIAGE_LEVELS = {
    CRITICAL: 'critical',
    URGENT: 'urgent',
    LESS_URGENT: 'less-urgent',
    NON_URGENT: 'non-urgent',
};

const emergencySchema = new mongoose.Schema(
    {
        emergencyNumber: {
            type: String,
            unique: true,
            required: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        arrivalTime: {
            type: Date,
            required: [true, 'Arrival time is required'],
            default: Date.now,
        },
        triageLevel: {
            type: String,
            enum: Object.values(TRIAGE_LEVELS),
            required: [true, 'Triage level is required'],
        },
        chiefComplaint: {
            type: String,
            required: [true, 'Chief complaint is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(EMERGENCY_STATUS),
            default: EMERGENCY_STATUS.REGISTERED,
        },
        vitals: {
            bloodPressure: { type: String },
            pulse: { type: Number },
            temperature: { type: Number },
            respiratoryRate: { type: Number },
            oxygenSaturation: { type: Number },
        },
        assignedDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedNurse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        treatmentNotes: {
            type: String,
            trim: true,
        },
        diagnosis: {
            type: String,
            trim: true,
        },
        disposition: {
            type: String,
            enum: ['discharge', 'admit', 'transfer', 'left-ama', 'deceased'],
        },
        admission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admission',
        },
        dischargeTime: {
            type: Date,
        },
        // New fields for Emergency Dashboard
        triageTime: {
            type: Date,
        },
        triageBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        treatmentStartTime: {
            type: Date,
        },
        treatmentEndTime: {
            type: Date,
        },
        triageHistory: [{
            level: {
                type: String,
                enum: Object.values(TRIAGE_LEVELS),
            },
            changedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            changedAt: {
                type: Date,
                default: Date.now,
            },
            reason: {
                type: String,
                trim: true,
            },
        }],
        createdBy: {
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
emergencySchema.index({ emergencyNumber: 1 });
emergencySchema.index({ patient: 1 });
emergencySchema.index({ status: 1 });
emergencySchema.index({ triageLevel: 1 });
emergencySchema.index({ arrivalTime: -1 });
// Composite index for live board queries
emergencySchema.index({ status: 1, arrivalTime: -1 });

// Auto-generate emergencyNumber before saving
emergencySchema.pre('save', async function (next) {
    if (this.isNew) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await mongoose.model('Emergency').countDocuments({
            createdAt: {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            },
        });
        this.emergencyNumber = `ER${dateStr}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Export constants for use in other files
Emergency = mongoose.model('Emergency', emergencySchema);
Emergency.EMERGENCY_STATUS = EMERGENCY_STATUS;
Emergency.TRIAGE_LEVELS = TRIAGE_LEVELS;

module.exports = Emergency;
