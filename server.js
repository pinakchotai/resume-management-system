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
import jwt from 'jsonwebtoken';

// Load Environment Variables
dotenv.config();

// Global Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // default 5MB
    },
    fileFilter: fileFilter
});

// Initialize Express app
const app = express();

// Security Middleware
if (isProduction) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
                "img-src": ["'self'", "data:", "blob:"],
                "connect-src": ["'self'"],
                "frame-ancestors": ["'none'"],
                "object-src": ["'self'"],
                "media-src": ["'self'"],
                "default-src": ["'self'"]
            }
        }
    }));
} else {
    // Disable CSP in development
    app.use(helmet({
        contentSecurityPolicy: false
    }));
}

// Basic Middleware
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// CORS Configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
    credentials: true
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

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

// Static Files - only serve public files
app.use(express.static('public'));

// Secure file access middleware
const secureFileAccess = (req, res, next) => {
    const token = req.cookies.adminToken;
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Database Connection
connectDB();

// View Engine
app.set('view engine', 'ejs');

// Routes
app.use('/admin', adminRouter);

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

// Global error handler middleware
app.use((err, req, res, next) => {
    Logger.error('Unhandled Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: !isProduction ? err.message : undefined
    });
});

// Start server
app.listen(port, () => {
    Logger.info(`Server is running on port ${port}`);
});
