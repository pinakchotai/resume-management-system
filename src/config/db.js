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
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 10000,
    retryReads: true,
    directConnection: false,
    replicaSet: 'atlas-nkxjvl-shard-0',
    ssl: true,
    authSource: 'admin'
};

let cachedConnection = null;

/**
 * Connect to MongoDB
 * Returns a promise that resolves when connected
 */
const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        Logger.info('Using cached database connection');
        return cachedConnection;
    }

    try {
        Logger.info('Connecting to MongoDB...');
        
        // Clear any existing connections
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }

        const conn = await mongoose.connect(MONGODB_URI, options);
        cachedConnection = conn;

        Logger.info('=================================');
        Logger.info('MongoDB Connection Established');
        Logger.info(`Host: ${conn.connection.host}`);
        Logger.info(`Database: ${conn.connection.name}`);
        Logger.info('=================================');

        // Handle connection errors
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

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            process.exit(0);
        });

        return conn;
    } catch (error) {
        Logger.error('MongoDB connection error:', error);
        cachedConnection = null;
        
        // Add more detailed error logging
        if (error.name === 'MongooseServerSelectionError') {
            Logger.error('Server Selection Error Details:', {
                message: error.message,
                reason: error.reason,
                hosts: Array.from(error.reason?.servers?.keys() || [])
            });
        }
        
        throw error;
    }
};

export default connectDB;