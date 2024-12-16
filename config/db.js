/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-management';

/**
 * MongoDB Connection Options
 */
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB
 * Returns a promise that resolves when connected
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI, options);
        console.log('=================================');
        console.log('MongoDB Connection Established');
        console.log(`Host: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
        console.log('=================================');

        // Handle connection events
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Log more details about the error
        if (error.name === 'MongoServerSelectionError') {
            console.error('Could not connect to any MongoDB server.');
            console.error('Please check if:');
            console.error('1. The connection string is correct');
            console.error('2. The MongoDB server is running');
            console.error('3. Network connectivity is available');
            console.error('4. IP whitelist settings in MongoDB Atlas');
        }
        process.exit(1);
    }
};

export default connectDB; 