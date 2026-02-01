/**
 * Reset isBilled flag on lab tests for testing
 * Run with: node reset_lab_billing.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function resetLabBilling() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get LabTest model
        const LabTest = require('./models/LabTest');

        // Count before reset
        const beforeCount = await LabTest.countDocuments({ isBilled: true });
        console.log(`\nBefore: ${beforeCount} lab tests have isBilled=true`);

        // Reset all to isBilled: false
        const result = await LabTest.updateMany(
            {},
            { $set: { isBilled: false, departmentBill: null } }
        );

        console.log(`\nReset ${result.modifiedCount} lab tests to isBilled=false`);

        // Count after reset
        const afterCount = await LabTest.countDocuments({ isBilled: { $ne: true } });
        console.log(`After: ${afterCount} lab tests are now available for billing`);

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        console.log('\n✅ Done! Refresh the Laboratory page to see the unbilled tests.');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

resetLabBilling();
