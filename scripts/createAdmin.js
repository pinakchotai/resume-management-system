import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/admin.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Default admin credentials
const defaultAdmin = {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
};

async function createAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: defaultAdmin.username });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);

        // Create new admin
        const admin = new Admin({
            username: defaultAdmin.username,
            password: hashedPassword
        });

        // Save admin to database
        await admin.save();
        console.log('Admin user created successfully');
        console.log('Username:', defaultAdmin.username);
        console.log('Password:', defaultAdmin.password);
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the script
createAdmin(); 