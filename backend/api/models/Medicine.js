/**
 * Medicine Master Model
 * Stores all medicines available for prescription
 */

const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Medicine name is required'],
            trim: true,
            unique: true
        },
        genericName: {
            type: String,
            trim: true
        },
        category: {
            type: String,
            enum: [
                'Analgesic',
                'Antibiotic',
                'Antacid',
                'Antidiabetic',
                'Antihypertensive',
                'Antihistamine',
                'Antiviral',
                'Antifungal',
                'Antipyretic',
                'Anti-inflammatory',
                'Bronchodilator',
                'Cardiac',
                'Diuretic',
                'Gastrointestinal',
                'Hormonal',
                'Immunosuppressant',
                'Laxative',
                'Muscle Relaxant',
                'Neurological',
                'Nutritional',
                'Ophthalmic',
                'Psychiatric',
                'Respiratory',
                'Sedative',
                'Steroid',
                'Vitamin',
                'Other'
            ],
            default: 'Other'
        },
        strength: {
            type: String,
            trim: true
        },
        form: {
            type: String,
            enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Gel', 'Patch', 'Suspension', 'Other'],
            default: 'Tablet'
        },
        manufacturer: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        requiresPrescription: {
            type: Boolean,
            default: true
        },
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes for fast search
medicineSchema.index({ name: 'text' });
medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ isActive: 1 });

// Static method for prefix search
medicineSchema.statics.searchByPrefix = async function (query, limit = 15) {
    if (!query || query.length < 1) {
        return this.find({ isActive: true })
            .select('name category strength form')
            .limit(limit)
            .sort({ name: 1 });
    }

    const regex = new RegExp(`^${query}`, 'i');
    return this.find({
        name: regex,
        isActive: true
    })
        .select('name category strength form')
        .limit(limit)
        .sort({ name: 1 });
};

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
