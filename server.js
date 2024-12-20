/**
 * Resume Management System - Server
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
import expressLayouts from 'express-ejs-layouts';

// Import configurations and middleware
import connectDB from './src/config/db.js';
import Logger from './src/config/logger.js';
import { limiter } from './src/middleware/rateLimiter.js';
import adminRoutes from './src/routes/admin.js';
import submissionRoutes from './src/routes/submissions.js';
import mainRoutes from './src/routes/main.js';

// Load Environment Variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// View engine setup
app.set('view engine', 'ejs');
const viewsPath = path.join(__dirname, 'src', 'views');
app.set('views', viewsPath);

// Express layouts setup - MUST be before any routes
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "http:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// Add middleware to log all requests
app.use(morgan('combined'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Rate limiting
app.use(limiter);

// Routes
app.use('/', mainRoutes);
app.use('/admin', adminRoutes);
app.use('/api/submissions', submissionRoutes);

// Static files - serve from src/public
const publicPath = path.join(__dirname, 'src', 'public');
app.use(express.static(publicPath));

// Error handling middleware
app.use((err, req, res, next) => {
    Logger.error('Unhandled error:', err);
    res.status(500).render('error', { 
        error: 'Internal server error',
        title: 'Error',
        currentPage: '',
        style: '',
        script: '',
        layout: 'layouts/main'
    });
});

// 404 handler
app.use((req, res) => {
    Logger.error('404 Not Found:', req.url);
    res.status(404).render('error', { 
        error: 'Page not found',
        title: 'Error',
        currentPage: '',
        style: '',
        script: '',
        layout: 'layouts/main'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

// Only start server if we're not in a test environment
if (process.env.NODE_ENV !== 'test') {
    mongoose.connection.once('open', () => {
        Logger.info('MongoDB connected successfully');
        app.listen(PORT, () => {
            Logger.info(`Server is running on port ${PORT}`);
            Logger.info('Server configuration:', {
                environment: process.env.NODE_ENV,
                viewEngine: app.get('view engine'),
                viewsPath: app.get('views'),
                layout: app.get('layout')
            });
        });
    });

    mongoose.connection.on('error', (err) => {
        Logger.error('MongoDB connection error:', err);
        process.exit(1);
    });
}

export default app;
