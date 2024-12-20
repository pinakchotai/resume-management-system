/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Logger from './logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-management';

/**
 * MongoDB Connection Options
 */
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000, // Timeout after 15 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
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

        // Handle connection errors after initial connection
        mongoose.connection.on('error', err => {
            Logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            Logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            Logger.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB; 