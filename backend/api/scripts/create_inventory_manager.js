const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const createInventoryManager = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'inventory@hospital.com';
        let user = await User.findOne({ email });

        if (user) {
            console.log('Inventory Manager user already exists.');
            // Update role if needed
            if (user.role !== 'inventory_manager') {
                user.role = 'inventory_manager';
                await user.save();
                console.log('Updated role to inventory_manager');
            }
        } else {
            user = await User.create({
                email,
                username: 'inventory_manager',
                password: 'password123', // Will be hashed by pre-save
                role: 'inventory_manager',
                profile: {
                    firstName: 'Inventory',
                    lastName: 'Manager',
                    employeeId: 'INV-001'
                }
            });
            console.log('Created Inventory Manager user: inventory@hospital.com / password123');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createInventoryManager();
