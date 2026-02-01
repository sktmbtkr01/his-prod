const mongoose = require('mongoose');

/**
 * SystemSettings Model
 * Stores hospital-wide configuration settings
 * Only one document exists (singleton pattern)
 */

const systemSettingsSchema = new mongoose.Schema(
    {
        // Unique identifier for singleton pattern
        settingsId: {
            type: String,
            default: 'HOSPITAL_SETTINGS',
            unique: true,
            immutable: true,
        },

        // Clinical Coding Configuration
        clinicalCoding: {
            enabled: {
                type: Boolean,
                default: false, // OFF by default
            },
            lastModifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            lastModifiedAt: {
                type: Date,
            },
        },

        // Future settings can be added here
        // e.g., billingSettings, notificationSettings, etc.

        // Audit trail for setting changes
        auditLog: [{
            setting: { type: String, required: true },
            previousValue: { type: mongoose.Schema.Types.Mixed },
            newValue: { type: mongoose.Schema.Types.Mixed },
            changedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            changedAt: {
                type: Date,
                default: Date.now,
            },
            reason: { type: String },
        }],
    },
    {
        timestamps: true,
    }
);

// Ensure only one document exists
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne({ settingsId: 'HOSPITAL_SETTINGS' });
    if (!settings) {
        settings = await this.create({ settingsId: 'HOSPITAL_SETTINGS' });
    }
    return settings;
};

// Method to update a setting with audit logging
systemSettingsSchema.methods.updateSetting = async function (settingPath, newValue, userId, reason = '') {
    const pathParts = settingPath.split('.');
    let current = this;
    let previousValue;

    // Get previous value
    for (let i = 0; i < pathParts.length; i++) {
        if (i === pathParts.length - 1) {
            previousValue = current[pathParts[i]];
        } else {
            current = current[pathParts[i]];
        }
    }

    // Update the value using set for nested paths
    this.set(settingPath, newValue);

    // Update metadata for specific settings
    if (settingPath === 'clinicalCoding.enabled') {
        this.clinicalCoding.lastModifiedBy = userId;
        this.clinicalCoding.lastModifiedAt = new Date();
    }

    // Add to audit log
    this.auditLog.push({
        setting: settingPath,
        previousValue,
        newValue,
        changedBy: userId,
        changedAt: new Date(),
        reason,
    });

    // Keep audit log to last 100 entries
    if (this.auditLog.length > 100) {
        this.auditLog = this.auditLog.slice(-100);
    }

    await this.save();
    return this;
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

module.exports = SystemSettings;
