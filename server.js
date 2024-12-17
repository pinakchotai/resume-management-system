/**
 * Resume Management System - Server
 * 
 * This is the main server file that handles:
 * - File uploads (resumes)
 * - Server configuration
 * - Basic routing
 * - Error handling
 * - Database connection
 */

// Required External Modules
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import configurations and middleware
import connectDB from './src/config/db.js';
import Logger from './src/config/logger.js';
import { limiter } from './src/middleware/rateLimiter.js';
import adminRoutes from './src/routes/admin.js';
import submissionRoutes from './src/routes/submissions.js';

// Load Environment Variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use(cors());
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // Cookie max age (1 day)
    }
}));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: message => Logger.info(message.trim()) } }));
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Routes
app.use('/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);

// Root route
app.get('/', (req, res) => {
    res.render('index');
});

// Error handling middleware
app.use((err, req, res, next) => {
    Logger.error('Unhandled error:', err);
    res.status(500).render('error', { error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { error: 'Page not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    Logger.info(`Server is running on port ${PORT}`);
});
