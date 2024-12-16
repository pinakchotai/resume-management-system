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
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import connectDB from './config/db.js';
import Logger from './config/logger.js';
import Submission from './models/submission.js';
import adminRouter from './routes/admin.js';
import { authMiddleware } from './middleware/authMiddleware.js';

// Load Environment Variables
dotenv.config();

// Global Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Express App
const app = express();

// Set up EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Basic Middleware Configuration
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

/**
 * Security Middleware Configuration
 */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    }
}));
app.use(compression());
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Serve static files
app.use(express.static('public', {
    maxAge: isProduction ? '1d' : 0,
    etag: true
}));

// Serve uploaded files (with authentication)
app.use('/uploads', authMiddleware.requireAuth, express.static('uploads', {
    maxAge: isProduction ? '1d' : 0,
    etag: true
}));

// Initialize MongoDB connection
connectDB();

/**
 * Mount Admin Routes
 */
app.use('/admin', adminRouter);

/**
 * File Upload Configuration
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // default 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

/**
 * Route Handlers
 */

// Root endpoint - Server status check
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

/**
 * Submission Routes
 */

// Create new submission with resume upload
app.post('/api/submissions', upload.single('resume'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'Resume file is required' });
        }

        // Create submission object
        const submission = new Submission({
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            experience: req.body.experience,
            skills: req.body.skills ? req.body.skills.split(',').map(skill => skill.trim()) : [],
            currentRole: req.body.currentRole,
            resumePath: req.file.path,
            fileName: req.file.originalname
        });

        // Save submission to database
        const savedSubmission = await submission.save();

        res.status(201).json({
            success: true,
            message: 'Submission received successfully',
            submission: savedSubmission.getBasicInfo()
        });
    } catch (error) {
        // If there's an error, delete the uploaded file
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                Logger.error('Error deleting file:', unlinkError);
            }
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation Error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        // Handle duplicate email error
        if (error.code === 11000 && error.keyPattern.email) {
            return res.status(400).json({
                error: 'Duplicate Error',
                message: 'An application with this email already exists'
            });
        }

        Logger.error('Submission error:', error);
        res.status(500).json({ error: 'Error processing submission' });
    }
});

/**
 * Server Initialization Functions
 */

// Initialize storage directories
async function initializeStorage() {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        Logger.info(`Storage initialized at ${uploadDir}`);
    } catch (error) {
        Logger.error('Error initializing storage:', error);
        throw error;
    }
}

// Start server function
async function startServer() {
    try {
        // Initialize storage
        await initializeStorage();
        
        // Connect to MongoDB
        await connectDB();
        
        // Start Express server
        const server = app.listen(port, () => {
            Logger.info('=================================');
            Logger.info('Resume Management System Server');
            Logger.info('=================================');
            Logger.info(`Environment: ${process.env.NODE_ENV}`);
            Logger.info(`Server running at http://localhost:${port}`);
            Logger.info('Press Ctrl+C to stop the server');
            Logger.info('=================================');
        });

        // Handle server errors
        server.on('error', (error) => {
            Logger.error('Server error:', error);
            process.exit(1);
        });

    } catch (error) {
        Logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Error Handling
 */

// Global error handler middleware
app.use((err, req, res, next) => {
    Logger.error('Unhandled Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: !isProduction ? err.message : undefined
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    Logger.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    Logger.info('SIGTERM received. Performing graceful shutdown...');
    app.close(() => {
        Logger.info('Server closed. Exiting process.');
        process.exit(0);
    });
});

// Start the server
startServer();

// Export for serverless
export default app;
