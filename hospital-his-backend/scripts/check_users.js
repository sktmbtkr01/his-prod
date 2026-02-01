const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path if needed
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        console.log('Checking for users...');
        const users = await User.find({}, 'name email role department'); // correct fields based on common schema

        if (users.length === 0) {
            console.log('\n[RESULT] No users found in the database.');
            console.log('You will need to run the seed script to create initial accounts.');
        } else {
            console.log(`\n[RESULT] Found ${users.length} users:`);
            console.table(users.map(u => ({
                Name: u.name,
                Email: u.email,
                Role: u.role,
                Department: u.department
            })));
        }

        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
