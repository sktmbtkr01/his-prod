/**
 * Diagnostic script to check lab test billing status
 * Run with: node check_lab_billing.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkLabBilling() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get LabTest model
        const LabTest = require('./models/LabTest');

        // Count all lab tests
        const totalCount = await LabTest.countDocuments();
        console.log(`\nTotal LabTests in database: ${totalCount}`);

        // Count by isBilled status
        const billedTrue = await LabTest.countDocuments({ isBilled: true });
        const billedFalse = await LabTest.countDocuments({ isBilled: false });
        const billedUndefined = await LabTest.countDocuments({ isBilled: { $exists: false } });
        const billedNotTrue = await LabTest.countDocuments({ isBilled: { $ne: true } });

        console.log(`\nisBilled breakdown:`);
        console.log(`  - isBilled: true = ${billedTrue}`);
        console.log(`  - isBilled: false = ${billedFalse}`);
        console.log(`  - isBilled: undefined (field doesn't exist) = ${billedUndefined}`);
        console.log(`  - isBilled: { $ne: true } (should get these) = ${billedNotTrue}`);

        // Show a sample of recent lab tests
        const recentTests = await LabTest.find()
            .select('testNumber status isBilled createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        console.log(`\nMost recent 5 LabTests:`);
        recentTests.forEach(test => {
            console.log(`  - ${test.testNumber} | Status: ${test.status} | isBilled: ${test.isBilled} | Created: ${test.createdAt}`);
        });

        // If all are billed, offer to reset them for testing
        if (billedNotTrue === 0 && totalCount > 0) {
            console.log('\n⚠️  ALL lab tests have isBilled=true!');
            console.log('   Run this command to reset for testing:');
            console.log('   db.labtests.updateMany({}, { $set: { isBilled: false } })');
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkLabBilling();
