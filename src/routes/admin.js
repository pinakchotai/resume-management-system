import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import Logger from '../config/logger.js';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import Submission from '../models/submission.js';

const router = express.Router();

// Root admin route - redirect to dashboard if authenticated, login if not
router.get('/', (req, res) => {
    const token = req.cookies.adminToken;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/admin/dashboard');
        } catch (error) {
            res.clearCookie('adminToken');
        }
    }
    res.redirect('/admin/login');
});

// Admin login page
router.get('/login', (req, res) => {
    res.render('admin/login', { 
        title: 'Admin Login',
        currentPage: 'admin-login',
        style: '',
        script: '',
        layout: false,
        error: null 
    });
});

// Admin login
router.post('/login', adminController.login);

// Admin logout
router.get('/logout', authMiddleware, adminController.logout);

// Admin dashboard
router.get('/dashboard', authMiddleware, adminController.dashboard);

// View single submission
router.get('/submissions/:id', authMiddleware, async (req, res) => {
    try {
        const submission = await adminController.viewSubmission(req, res);
        res.render('admin/submission', {
            title: 'View Submission',
            currentPage: 'admin-submission',
            style: '',
            script: '',
            layout: 'layouts/main',
            submission
        });
    } catch (error) {
        Logger.error('Error viewing submission:', error);
        res.status(500).render('error', {
            title: 'Error',
            currentPage: 'error',
            style: '',
            script: '',
            layout: 'layouts/main',
            error: 'Error viewing submission'
        });
    }
});

// Download resume file
router.get('/submissions/:id/download', authMiddleware, (req, res) => {
    try {
        Logger.info('Admin download request for submission:', req.params.id);
        res.redirect(`/api/submissions/${req.params.id}/download`);
    } catch (error) {
        Logger.error('Error in admin download route:', error);
        res.status(500).render('error', {
            title: 'Error',
            currentPage: 'error',
            style: '',
            script: '',
            layout: 'layouts/main',
            error: 'Error downloading file'
        });
    }
});

// View resume file
router.get('/submissions/:id/view', authMiddleware, (req, res) => {
    try {
        Logger.info('Admin view request for submission:', req.params.id);
        // Forward to the API endpoint
        res.redirect(`/api/submissions/${req.params.id}/view`);
    } catch (error) {
        Logger.error('Error in admin view route:', error);
        res.status(500).render('error', { error: 'Error viewing file' });
    }
});

// Update submission status
router.post('/submissions/:id/status', authMiddleware, adminController.updateStatus);

// Search submissions
router.get('/search', authMiddleware, adminController.search);

// Bulk download resumes
router.post('/submissions/bulk-download', authMiddleware, adminController.bulkDownload);

// Export submissions to Excel
router.post('/submissions/export-excel', authMiddleware, async (req, res) => {
    try {
        const submissions = await Submission.find({}, {
            fullName: 1,
            email: 1,
            phone: 1,
            experience: 1,
            skills: 1,
            currentRole: 1,
            status: 1,
            createdAt: 1
        }).sort({ createdAt: -1 });

        // Convert submissions to worksheet data
        const wsData = submissions.map(submission => ({
            Name: submission.fullName || 'N/A',
            Email: submission.email || 'N/A',
            Phone: submission.phone || 'N/A',
            'Experience (Years)': submission.experience || 'N/A',
            Skills: (submission.skills || []).join(', '),
            'Current Role': submission.currentRole || 'N/A',
            Status: submission.status ? submission.status.charAt(0).toUpperCase() + submission.status.slice(1) : 'Pending',
            'Submission Date': submission.createdAt.toLocaleDateString()
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(wsData);

        // Set column widths
        const colWidths = [
            { wch: 25 }, // Name
            { wch: 30 }, // Email
            { wch: 15 }, // Phone
            { wch: 15 }, // Experience
            { wch: 40 }, // Skills
            { wch: 25 }, // Current Role
            { wch: 15 }, // Status
            { wch: 20 }  // Date
        ];
        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Submissions');

        // Generate buffer
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set headers for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=submissions.xlsx');
        
        // Send the file
        res.send(excelBuffer);
    } catch (error) {
        Logger.error('Error exporting to Excel:', error);
        res.status(500).json({ error: 'Error generating Excel report' });
    }
});

// Delete submission
router.delete('/submissions/:id', authMiddleware, async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Delete the submission and associated file
        await submission.remove();
        Logger.info('Submission deleted successfully:', req.params.id);
        res.json({ success: true, message: 'Submission deleted successfully' });
    } catch (error) {
        Logger.error('Error deleting submission:', error);
        res.status(500).json({ error: 'Error deleting submission' });
    }
});

export default router; 