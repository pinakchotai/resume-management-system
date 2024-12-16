import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import Logger from '../config/logger.js';

export const authMiddleware = {
    requireAuth: async (req, res, next) => {
        try {
            // Check for token in cookies
            const token = req.cookies.adminToken;
            if (!token) {
                return res.redirect('/admin/login');
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check if admin still exists and is not locked
            const admin = await Admin.findOne({ 
                username: decoded.username,
                isLocked: false 
            });

            if (!admin) {
                res.clearCookie('adminToken');
                return res.redirect('/admin/login');
            }

            // Attach admin to request
            req.admin = admin;
            next();
        } catch (error) {
            Logger.error('Authentication error:', error);
            res.clearCookie('adminToken');
            res.redirect('/admin/login');
        }
    },

    // CSRF Protection
    csrfProtection: (req, res, next) => {
        // Only allow specific origins
        const allowedMethods = ['GET', 'POST'];
        if (!allowedMethods.includes(req.method)) {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Verify CSRF token for POST requests
        if (req.method === 'POST') {
            const csrfToken = req.cookies._csrf;
            const headerToken = req.headers['x-csrf-token'];

            if (!csrfToken || !headerToken || csrfToken !== headerToken) {
                return res.status(403).json({ error: 'Invalid CSRF token' });
            }
        }

        next();
    },

    // Security Headers
    securityHeaders: (req, res, next) => {
        res.set({
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Content-Security-Policy': "default-src 'self'",
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        next();
    }
}; 