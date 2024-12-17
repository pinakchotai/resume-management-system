import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import * as adminController from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Logger from '../config/logger.js';

const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many login attempts. Please try again later.' }
});

// Root admin route redirect
router.get('/', authMiddleware.requireAuth, (req, res) => {
    res.redirect('/admin/dashboard');
});

// Public routes
router.get('/login', adminController.loginPage);
router.post('/login', loginLimiter, adminController.login);

// Protected routes (require authentication)
router.use(authMiddleware.requireAuth);
router.get('/dashboard', adminController.dashboard);
router.post('/logout', adminController.logout);
router.get('/submissions/:id', adminController.viewSubmission);
router.post('/submissions/:id/status', adminController.updateSubmissionStatus);

// File download and view routes with logging
router.get('/submissions/:id/download', (req, res, next) => {
    Logger.info(`Download route accessed for submission ID: ${req.params.id}`);
    Logger.info(`Request headers:`, req.headers);
    next();
}, adminController.downloadResume);

router.get('/submissions/:id/view', (req, res, next) => {
    Logger.info(`View route accessed for submission ID: ${req.params.id}`);
    Logger.info(`Request headers:`, req.headers);
    next();
}, adminController.viewResume);

export default router; 