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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import connectDB from './config/db.js';
import Logger from './config/logger.js';
import Submission from './models/submission.js';

// Load Environment Variables
dotenv.config();

// Global Constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Express App
const app = express();

/**
 * Security Middleware Configuration
 */
app.use(helmet()); // Add security headers
app.use(compression()); // Compress responses
app.use(morgan(isProduction ? 'combined' : 'dev')); // HTTP request logging

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000 // limit each IP
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

/**
 * Basic Middleware Configuration
 */
app.use(express.json());
app.use(cookieParser());

// Serve static files with cache control
app.use(express.static('public', {
    maxAge: isProduction ? '1d' : 0,
    etag: true
}));

// Initialize MongoDB connection
connectDB();

// Check if admin exists
let adminConfigured = false;

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken;
        if (!token) {
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            return res.redirect('/admin-login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.email !== process.env.ADMIN_EMAIL) {
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            return res.redirect('/admin-login');
        }

        next();
    } catch (error) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.redirect('/admin-login');
    }
};

// Admin Registration Routes
app.get('/admin-register', async (req, res) => {
    const isConfigured = await checkAdminConfig();
    if (!isConfigured) {
        return res.sendFile(path.join(__dirname, 'public', 'admin-register.html'));
    }
    res.redirect('/admin-login');
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin', authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin API Routes
app.post('/api/admin/register', async (req, res) => {
    try {
        const isConfigured = await checkAdminConfig();
        if (isConfigured) {
            return res.status(403).json({ error: 'Admin already configured' });
        }

        const { email, password } = req.body;

        // Validate email and password
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate secure tokens
        const jwtSecret = crypto.randomBytes(32).toString('hex');
        const cookieSecret = crypto.randomBytes(32).toString('hex');

        // Create .env file content
        const envContent = `# Security
JWT_SECRET=${jwtSecret}
ADMIN_PASSWORD_HASH=${hashedPassword}
ADMIN_EMAIL=${email}

# Environment
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/resume-management

# Cookie Settings
COOKIE_SECRET=${cookieSecret}
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true

# File Upload
MAX_FILE_SIZE=2097152 # 2MB in bytes
ALLOWED_FILE_TYPES=application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`;

        // Write to .env file
        await fs.writeFile('.env', envContent, { encoding: 'utf8', flag: 'w' });

        // Set admin as configured
        adminConfigured = true;
        process.env.ADMIN_EMAIL = email;
        process.env.ADMIN_PASSWORD_HASH = hashedPassword;
        process.env.JWT_SECRET = jwtSecret;

        res.status(201).json({ 
            message: 'Admin configured successfully',
            note: 'Please restart the server to apply changes'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Error during registration',
            details: error.message
        });
    }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (email !== process.env.ADMIN_EMAIL) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { email: process.env.ADMIN_EMAIL },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ message: 'Logged in successfully' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ message: 'Logged out successfully' });
});

/**
 * File Upload Configuration
 * - Configures storage location and filename
 * - Sets file size limits
 * - Validates file types
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
    res.json({ message: 'Server is running' });
});

// Health check endpoint - Detailed server status
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
                console.error('Error deleting file:', unlinkError);
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

        console.error('Submission error:', error);
        res.status(500).json({ error: 'Error processing submission' });
    }
});

// Get all submissions
app.get('/api/submissions', authenticateAdmin, async (req, res) => {
    try {
        const submissions = await Submission.find()
            .sort({ createdAt: -1 })
            .select('-resumePath');

        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Error fetching submissions' });
    }
});

// Get a single submission
app.get('/api/submissions/:id', authenticateAdmin, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json(submission);
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Error fetching submission' });
    }
});

// Download resume
app.get('/api/submissions/:id/resume', authenticateAdmin, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.download(submission.resumePath, submission.fileName);
    } catch (error) {
        console.error('Error downloading resume:', error);
        res.status(500).json({ error: 'Error downloading resume' });
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
        console.log(`Storage initialized at ${uploadDir}`);
    } catch (error) {
        console.error('Error initializing storage:', error);
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
