require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createTestUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if test user already exists
        const existingUser = await User.findOne({ email: 'admin@example.com' });
        if (existingUser) {
            console.log('Test user already exists');
            await mongoose.connection.close();
            return;
        }

        // Create test user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const user = new User({
            email: 'admin@example.com',
            password: hashedPassword,
            name: 'Admin User'
        });

        await user.save();
        console.log('Test user created successfully');

        // Close MongoDB connection
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createTestUser();
