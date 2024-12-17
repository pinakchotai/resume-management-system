import jwt from 'jsonwebtoken';
import Logger from '../config/logger.js';

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.adminToken;
        
        if (!token) {
            Logger.info('No auth token found, redirecting to login');
            return res.redirect('/admin/login');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            Logger.error('Invalid token:', error);
            res.clearCookie('adminToken');
            return res.redirect('/admin/login');
        }
    } catch (error) {
        Logger.error('Auth middleware error:', error);
        return res.status(500).render('error', { error: 'Authentication error' });
    }
};

// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
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
};

// Security Headers Middleware
const securityHeaders = (req, res, next) => {
    res.set({
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    next();
};

// Export all middleware functions
export {
    authMiddleware,
    csrfProtection,
    securityHeaders
}; 