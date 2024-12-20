/**
 * Database Configuration
 * Handles MongoDB connection using Mongoose
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Logger from './logger.js';

dotenv.config();

// Construct MongoDB URI with explicit replica set configuration
const constructMongoURI = () => {
    const username = encodeURIComponent('pinakchotai');
    const password = encodeURIComponent('pinak123');
    const cluster = 'remanagecluster.bhaga.mongodb.net';
    const database = 'resume-management';

    return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`;
};

const MONGODB_URI = process.env.MONGODB_URI || constructMongoURI();

/**
 * MongoDB Connection Options
 */
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 45000,
    family: 4
};

let cachedConnection = null;

/**
 * Connect to MongoDB
 * Returns a promise that resolves when connected
 */
const connectDB = async () => {
    if (cachedConnection && mongoose.connection.readyState === 1) {
        return cachedConnection;
    }

    try {
        Logger.info('Connecting to MongoDB...');
        
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }

        const conn = await mongoose.connect(MONGODB_URI, options);
        cachedConnection = conn;

        Logger.info('MongoDB Connected');

        mongoose.connection.on('error', err => {
            Logger.error('MongoDB connection error:', err);
            cachedConnection = null;
        });

        mongoose.connection.on('disconnected', () => {
            Logger.warn('MongoDB disconnected');
            cachedConnection = null;
        });

        return conn;
    } catch (error) {
        Logger.error('MongoDB connection error:', error);
        cachedConnection = null;
        throw error;
    }
};

export default connectDB;