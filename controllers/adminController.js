import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.js';
import Submission from '../models/submission.js';
import Logger from '../config/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render login page
export const loginPage = (req, res) => {
    res.render('admin/login', { error: null });
};

// Handle login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.render('admin/login', { 
                error: 'Username and password are required' 
            });
        }

        // Find admin
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.render('admin/login', { 
                error: 'Invalid credentials' 
            });
        }

        // Check if account is locked
        if (admin.isLocked) {
            return res.render('admin/login', { 
                error: 'Account is locked. Please contact support.' 
            });
        }

        // Validate password
        const isValid = await admin.validatePassword(password);
        if (!isValid) {
            await admin.handleFailedLogin();
            return res.render('admin/login', { 
                error: 'Invalid credentials' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Update last login and reset login attempts
        await admin.handleSuccessfulLogin();

        // Set secure cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        // Generate CSRF token
        const csrfToken = jwt.sign({}, process.env.JWT_SECRET);
        res.cookie('_csrf', csrfToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.redirect('/admin/dashboard');
    } catch (error) {
        Logger.error('Login error:', error);
        res.render('admin/login', { 
            error: 'An error occurred during login' 
        });
    }
};

// Handle logout
export const logout = (req, res) => {
    res.clearCookie('adminToken');
    res.clearCookie('_csrf');
    res.redirect('/admin/login');
};

// Render dashboard
export const dashboard = async (req, res) => {
    try {
        // Get statistics
        const stats = {
            totalSubmissions: await Submission.countDocuments(),
            todaySubmissions: await Submission.countDocuments({
                createdAt: {
                    $gte: new Date().setHours(0, 0, 0, 0)
                }
            }),
            pendingReview: await Submission.countDocuments({
                status: 'pending'
            })
        };

        // Get recent submissions
        const submissions = await Submission.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('fullName email createdAt status');

        res.render('admin/dashboard', { stats, submissions });
    } catch (error) {
        Logger.error('Dashboard error:', error);
        res.status(500).render('error', { 
            error: 'Error loading dashboard' 
        });
    }
};

// View single submission
export const viewSubmission = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).render('error', { 
                error: 'Submission not found' 
            });
        }
        
        // Generate CSRF token
        const csrfToken = jwt.sign({}, process.env.JWT_SECRET);
        
        res.render('admin/submission', { 
            submission,
            csrfToken 
        });
    } catch (error) {
        Logger.error('View submission error:', error);
        res.status(500).render('error', { 
            error: 'Error loading submission' 
        });
    }
};

// Update submission status
export const updateSubmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).render('error', {
                error: 'Invalid status value'
            });
        }

        // Update submission
        const submission = await Submission.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!submission) {
            return res.status(404).render('error', {
                error: 'Submission not found'
            });
        }

        // Redirect back to submission page
        res.redirect(`/admin/submissions/${id}`);
    } catch (error) {
        Logger.error('Update status error:', error);
        res.status(500).render('error', {
            error: 'Error updating submission status'
        });
    }
};

// Download resume
export const downloadResume = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).render('error', { 
                error: 'Submission not found' 
            });
        }

        // Construct file path
        const filePath = path.join(__dirname, '..', submission.resumePath);

        // Set headers for download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${submission.fileName}"`);

        // Send file
        res.download(filePath, submission.fileName, (err) => {
            if (err) {
                Logger.error('Download error:', err);
                return res.status(500).render('error', { 
                    error: 'Error downloading file' 
                });
            }
        });
    } catch (error) {
        Logger.error('Download error:', error);
        res.status(500).render('error', { 
            error: 'Error downloading resume' 
        });
    }
};

// View resume
export const viewResume = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).render('error', { 
                error: 'Submission not found' 
            });
        }

        // Construct file path
        const filePath = path.join(__dirname, '..', submission.resumePath);

        // Set appropriate content type based on file extension
        const ext = path.extname(submission.fileName).toLowerCase();
        let contentType = 'application/octet-stream';
        
        switch (ext) {
            case '.pdf':
                contentType = 'application/pdf';
                break;
            case '.doc':
                contentType = 'application/msword';
                break;
            case '.docx':
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
        }

        // Set headers for inline viewing
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${submission.fileName}"`);

        // Send file
        res.sendFile(filePath, (err) => {
            if (err) {
                Logger.error('View error:', err);
                return res.status(500).render('error', { 
                    error: 'Error viewing file' 
                });
            }
        });
    } catch (error) {
        Logger.error('View error:', error);
        res.status(500).render('error', { 
            error: 'Error viewing resume' 
        });
    }
}; 