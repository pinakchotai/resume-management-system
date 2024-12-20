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
    serverSelectionTimeoutMS: 30000, // Increased timeout to 30 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 10000,
    retryReads: true
};

let cachedConnection = null;

/**
 * Connect to MongoDB
 * Returns a promise that resolves when connected
 */
const connectDB = async () => {
    if (cachedConnection) {
        Logger.info('Using cached database connection');
        return cachedConnection;
    }

    try {
        Logger.info('Connecting to MongoDB...');
        const conn = await mongoose.connect(MONGODB_URI, options);
        
        cachedConnection = conn;

        Logger.info('=================================');
        Logger.info('MongoDB Connection Established');
        Logger.info(`Host: ${conn.connection.host}`);
        Logger.info(`Database: ${conn.connection.name}`);
        Logger.info('=================================');

        // Handle connection errors after initial connection
        mongoose.connection.on('error', err => {
            Logger.error('MongoDB connection error:', err);
            cachedConnection = null;
        });

        mongoose.connection.on('disconnected', () => {
            Logger.warn('MongoDB disconnected. Connection will be re-established on next request.');
            cachedConnection = null;
        });

        mongoose.connection.on('reconnected', () => {
            Logger.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        Logger.error('MongoDB connection error:', error);
        cachedConnection = null;
        throw error; // Don't exit process, let the caller handle the error
    }
};

export default connectDB; 