/**
 * Seed Departments Script
 * Creates realistic hospital departments with productivity data
 * Run with: node seed_departments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function seedDepartments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Department = require('./models/Department');

        // Define comprehensive hospital departments
        const departments = [
            // Clinical Departments
            {
                departmentCode: 'GEN-MED',
                name: 'General Medicine',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 500,
                followupFee: 300,
                description: 'Primary care and internal medicine',
                isActive: true
            },
            {
                departmentCode: 'GYNAE',
                name: 'Gynecology & Obstetrics',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 600,
                followupFee: 400,
                description: 'Women\'s health and maternity care',
                isActive: true
            },
            {
                departmentCode: 'ORTHO',
                name: 'Orthopedics',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 700,
                followupFee: 400,
                description: 'Bone and joint care',
                isActive: true
            },
            {
                departmentCode: 'PEDIA',
                name: 'Pediatrics',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 500,
                followupFee: 300,
                description: 'Child healthcare',
                isActive: true
            },
            {
                departmentCode: 'CARDIO',
                name: 'Cardiology',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 800,
                followupFee: 500,
                description: 'Heart and cardiovascular care',
                isActive: true
            },
            {
                departmentCode: 'NEURO',
                name: 'Neurology',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 800,
                followupFee: 500,
                description: 'Brain and nervous system',
                isActive: true
            },
            {
                departmentCode: 'DERM',
                name: 'Dermatology',
                type: 'clinical',
                isEmergencyAvailable: false,
                consultationFee: 500,
                followupFee: 300,
                description: 'Skin care and cosmetic dermatology',
                isActive: true
            },
            {
                departmentCode: 'ENT',
                name: 'ENT (Ear, Nose, Throat)',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 500,
                followupFee: 300,
                description: 'Ear, nose and throat treatment',
                isActive: true
            },
            {
                departmentCode: 'OPHTH',
                name: 'Ophthalmology',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 500,
                followupFee: 300,
                description: 'Eye care and surgery',
                isActive: true
            },
            {
                departmentCode: 'SURG',
                name: 'General Surgery',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 700,
                followupFee: 400,
                description: 'Surgical procedures',
                isActive: true
            },
            {
                departmentCode: 'EMER',
                name: 'Emergency Medicine',
                type: 'clinical',
                isEmergencyAvailable: true,
                consultationFee: 1000,
                followupFee: 500,
                description: '24x7 emergency care',
                isActive: true
            },
            {
                departmentCode: 'DENTAL',
                name: 'Dental',
                type: 'clinical',
                isEmergencyAvailable: false,
                consultationFee: 400,
                followupFee: 200,
                description: 'Dental care and oral surgery',
                isActive: true
            },
            // Diagnostic Departments
            {
                departmentCode: 'LAB',
                name: 'Laboratory',
                type: 'diagnostic',
                isEmergencyAvailable: true,
                description: 'Pathology and lab tests',
                isActive: true
            },
            {
                departmentCode: 'RADIO',
                name: 'Radiology',
                type: 'diagnostic',
                isEmergencyAvailable: true,
                description: 'X-Ray, CT, MRI, Ultrasound',
                isActive: true
            },
            // Support Departments
            {
                departmentCode: 'PHARM',
                name: 'Pharmacy',
                type: 'support',
                isEmergencyAvailable: true,
                description: 'Medication dispensing',
                isActive: true
            },
            {
                departmentCode: 'PHYSIO',
                name: 'Physiotherapy',
                type: 'support',
                isEmergencyAvailable: false,
                consultationFee: 400,
                followupFee: 300,
                description: 'Physical rehabilitation',
                isActive: true
            },
            {
                departmentCode: 'ICU',
                name: 'Intensive Care Unit',
                type: 'clinical',
                isEmergencyAvailable: true,
                description: 'Critical care',
                isActive: true
            },
            {
                departmentCode: 'NICU',
                name: 'Neonatal ICU',
                type: 'clinical',
                isEmergencyAvailable: true,
                description: 'Newborn intensive care',
                isActive: true
            }
        ];

        console.log(`\nSeeding ${departments.length} departments...`);

        for (const dept of departments) {
            await Department.findOneAndUpdate(
                { departmentCode: dept.departmentCode },
                dept,
                { upsert: true, new: true }
            );
            console.log(`  ✓ ${dept.name}`);
        }

        console.log(`\n✅ Successfully seeded ${departments.length} departments!`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

seedDepartments();
