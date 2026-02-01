const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../config/constants');

/**
 * DepartmentBill Model
 * Represents department-specific bills (Pharmacy, Lab, Radiology)
 * Multiple department bills roll up to one master OPD bill
 */

const DEPARTMENT_TYPES = ['pharmacy', 'laboratory', 'radiology'];

const departmentBillSchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            unique: true,
        },
        department: {
            type: String,
            enum: DEPARTMENT_TYPES,
            required: [true, 'Department is required'],
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient is required'],
        },
        // OPD Encounter reference
        encounter: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'encounterModel',
            required: [true, 'Encounter is required'],
        },
        encounterModel: {
            type: String,
            enum: ['Appointment', 'Admission', 'Emergency'],
            required: true,
        },
        // Link to master OPD bill (for central billing view)
        masterBill: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Billing',
        },
        // Orders covered by this department bill
        orders: [{
            orderType: {
                type: String,
                enum: ['lab', 'radiology', 'pharmacy'],
                required: true,
            },
            orderReference: {
                type: mongoose.Schema.Types.ObjectId,
                refPath: 'orders.orderRefModel',
                required: true,
            },
            orderRefModel: {
                type: String,
                enum: ['LabTest', 'Radiology', 'PharmacyDispense'],
                required: true,
            },
            orderNumber: { type: String }, // e.g., LAB20260124001
        }],
        // Line items
        items: [{
            description: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            rate: {
                type: Number,
                required: true,
                min: 0,
            },
            amount: {
                type: Number,
                required: true,
            },
            discount: {
                type: Number,
                default: 0,
            },
            tax: {
                type: Number,
                default: 0,
            },
            netAmount: {
                type: Number,
                required: true,
            },
            // Reference to specific order item
            orderItemRef: {
                type: mongoose.Schema.Types.ObjectId,
            },
        }],
        // Totals
        subtotal: {
            type: Number,
            required: true,
            default: 0,
        },
        totalDiscount: {
            type: Number,
            default: 0,
        },
        totalTax: {
            type: Number,
            default: 0,
        },
        grandTotal: {
            type: Number,
            required: true,
            default: 0,
        },
        // Payment tracking
        paidAmount: {
            type: Number,
            default: 0,
        },
        balanceAmount: {
            type: Number,
            default: 0,
        },
        paymentStatus: {
            type: String,
            enum: Object.values(PAYMENT_STATUS),
            default: PAYMENT_STATUS.PENDING,
        },
        // Payment details
        payments: [{
            amount: {
                type: Number,
                required: true,
            },
            mode: {
                type: String,
                enum: ['cash', 'card', 'upi', 'online', 'insurance'],
                required: true,
            },
            reference: { type: String },
            receivedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            receivedAt: {
                type: Date,
                default: Date.now,
            },
            receiptNumber: { type: String },
        }],
        // Status
        status: {
            type: String,
            enum: ['draft', 'finalized', 'cancelled'],
            default: 'finalized', // Department bills are usually finalized immediately
        },
        // Audit
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        billDate: {
            type: Date,
            default: Date.now,
        },
        // Lock after payment
        isLocked: {
            type: Boolean,
            default: false,
        },
        lockedAt: Date,
        // Audit Trail
        auditTrail: [{
            action: {
                type: String,
                required: true,
            },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            performedAt: {
                type: Date,
                default: Date.now,
            },
            details: mongoose.Schema.Types.Mixed,
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes
departmentBillSchema.index({ billNumber: 1 });
departmentBillSchema.index({ patient: 1 });
departmentBillSchema.index({ encounter: 1 });
departmentBillSchema.index({ masterBill: 1 });
departmentBillSchema.index({ department: 1 });
departmentBillSchema.index({ paymentStatus: 1 });
departmentBillSchema.index({ billDate: -1 });

// Auto-generate billNumber before saving
departmentBillSchema.pre('save', async function (next) {
    if (this.isNew && !this.billNumber) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = this.department.substring(0, 3).toUpperCase();
        const count = await mongoose.model('DepartmentBill').countDocuments({ department: this.department });
        this.billNumber = `${prefix}${dateStr}${String(count + 1).padStart(5, '0')}`;
    }

    // Calculate totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.totalTax = this.items.reduce((sum, item) => sum + (item.tax || 0), 0);
    this.grandTotal = this.subtotal - this.totalDiscount + this.totalTax;
    this.balanceAmount = this.grandTotal - this.paidAmount;

    // Update payment status
    if (this.paidAmount >= this.grandTotal && this.grandTotal > 0) {
        this.paymentStatus = PAYMENT_STATUS.PAID;
        this.isLocked = true;
        this.lockedAt = new Date();
    } else if (this.paidAmount > 0) {
        this.paymentStatus = PAYMENT_STATUS.PARTIAL;
    } else {
        this.paymentStatus = PAYMENT_STATUS.PENDING;
    }

    next();
});

// Generate receipt number
departmentBillSchema.methods.generateReceiptNumber = function () {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = this.department.substring(0, 3).toUpperCase();
    return `RCP${prefix}${dateStr}${String(this.payments.length).padStart(3, '0')}`;
};

const DepartmentBill = mongoose.model('DepartmentBill', departmentBillSchema);

module.exports = DepartmentBill;
module.exports.DEPARTMENT_TYPES = DEPARTMENT_TYPES;
