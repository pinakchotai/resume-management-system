import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import Admin from '../models/admin.js';
import Submission from '../models/submission.js';
import Logger from '../config/logger.js';
import { Readable } from 'stream';
import JSZip from 'jszip';
import path from 'path';
import { getFileStream, getFileInfo } from '../config/gridfs.js';

// Handle login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            Logger.warn('Login attempt with missing credentials');
            return res.render('admin/login', { 
                error: 'Username and password are required' 
            });
        }

        Logger.info('Login attempt details:', {
            username,
            passwordProvided: !!password
        });

        // Find admin user
        const admin = await Admin.findOne({ username });
        if (!admin) {
            Logger.warn('Login attempt failed - user not found:', username);
            return res.render('admin/login', { 
                error: 'Invalid credentials' 
            });
        }

        Logger.info('Found admin user:', {
            username: admin.username,
            hasPasswordHash: !!admin.password,
            hasPasswordHashField: !!admin.passwordHash
        });

        // Try both password fields for backward compatibility
        let isValidPassword = false;
        if (admin.password) {
            isValidPassword = await bcrypt.compare(password, admin.password);
        } else if (admin.passwordHash) {
            isValidPassword = await bcrypt.compare(password, admin.passwordHash);
        }

        if (!isValidPassword) {
            Logger.warn('Login attempt failed - invalid password for username:', username);
            return res.render('admin/login', { 
                error: 'Invalid credentials' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: admin._id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Set cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        Logger.info('Successful login for username:', username);
        res.redirect('/admin/dashboard');
    } catch (error) {
        Logger.error('Login error:', error);
        res.status(500).render('error', { error: 'Error during login' });
    }
};

// Handle logout
export const logout = (req, res) => {
    res.clearCookie('adminToken');
    res.redirect('/admin/login');
};

// Render dashboard
export const dashboard = async (req, res) => {
    try {
        Logger.info('Starting dashboard data fetch');

        // Generate CSRF token for bulk downloads
        const csrfToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Set CSRF token cookie
        res.cookie('_csrf', csrfToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        // Get recent submissions with explicit fields including skills
        const submissions = await Submission.find({}, {
            fullName: 1,
            email: 1,
            status: 1,
            createdAt: 1,
            skills: 1
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

        Logger.info('Recent submissions fetched:', {
            count: submissions.length,
            firstSubmission: submissions[0] ? {
                id: submissions[0]._id,
                status: submissions[0].status,
                skillsCount: submissions[0].skills?.length || 0
            } : 'none'
        });

        // Get today's start date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate all stats in parallel for better performance
        const [
            totalCount,
            pendingCount,
            reviewedCount,
            shortlistedCount,
            rejectedCount,
            todayCount
        ] = await Promise.all([
            Submission.countDocuments(),
            Submission.countDocuments({ status: 'pending' }),
            Submission.countDocuments({ status: 'reviewed' }),
            Submission.countDocuments({ status: 'shortlisted' }),
            Submission.countDocuments({ status: 'rejected' }),
            Submission.countDocuments({ createdAt: { $gte: today } })
        ]);

        Logger.info('Raw counts:', {
            total: totalCount,
            pending: pendingCount,
            reviewed: reviewedCount,
            shortlisted: shortlistedCount,
            rejected: rejectedCount,
            today: todayCount
        });

        // Calculate statistics
        const stats = {
            total: totalCount,
            pending: pendingCount,
            reviewed: reviewedCount,
            shortlisted: shortlistedCount,
            rejected: rejectedCount,
            todaySubmissions: todayCount,
            pendingReview: pendingCount
        };

        // Calculate percentages for the progress bar
        if (stats.total > 0) {
            stats.percentages = {
                pending: Math.round((stats.pending / stats.total) * 100),
                reviewed: Math.round((stats.reviewed / stats.total) * 100),
                shortlisted: Math.round((stats.shortlisted / stats.total) * 100),
                rejected: Math.round((stats.rejected / stats.total) * 100)
            };
        } else {
            stats.percentages = {
                pending: 0,
                reviewed: 0,
                shortlisted: 0,
                rejected: 0
            };
        }

        // Get unique skills across all submissions
        const uniqueSkills = new Set();
        submissions.forEach(submission => {
            if (Array.isArray(submission.skills)) {
                submission.skills.forEach(skill => {
                    if (skill) uniqueSkills.add(skill.toLowerCase());
                });
            }
        });

        Logger.info('Final dashboard stats:', {
            total: stats.total,
            percentages: stats.percentages,
            submissionsCount: submissions.length,
            uniqueSkillsCount: uniqueSkills.size
        });

        res.render('admin/dashboard', { 
            submissions,
            stats,
            moment,
            uniqueSkills: Array.from(uniqueSkills).sort(),
            csrfToken
        });
    } catch (error) {
        Logger.error('Dashboard error:', error);
        res.status(500).render('error', { 
            error: 'Error loading dashboard: ' + error.message 
        });
    }
};

// View single submission
export const viewSubmission = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission) {
            return res.status(404).render('error', { error: 'Submission not found' });
        }

        Logger.info('Viewing submission:', {
            id: submission._id,
            hasResumeFile: !!submission.resumeFile,
            fileId: submission.resumeFile?.fileId
        });

        // Generate CSRF token
        const csrfToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Set CSRF token cookie
        res.cookie('_csrf', csrfToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.render('admin/submission', { 
            submission,
            csrfToken
        });
    } catch (error) {
        Logger.error('View submission error:', error);
        res.status(500).render('error', { error: 'Error viewing submission' });
    }
};

// Update submission status
export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const submission = await Submission.findById(id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        submission.status = status;
        await submission.save();

        // Return JSON response
        res.json({
            success: true,
            message: 'Status updated successfully',
            status: submission.status
        });
    } catch (error) {
        Logger.error('Error updating submission status:', error);
        res.status(500).json({ error: 'Error updating status' });
    }
};

// Search submissions
export const search = async (req, res) => {
    try {
        const { query, status } = req.query;
        const searchQuery = {};

        if (query) {
            searchQuery.$or = [
                { fullName: new RegExp(query, 'i') },
                { email: new RegExp(query, 'i') },
                { skills: new RegExp(query, 'i') }
            ];
        }

        if (status && status !== 'all') {
            searchQuery.status = status;
        }

        const submissions = await Submission.find(searchQuery)
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(submissions);
    } catch (error) {
        Logger.error('Search error:', error);
        res.status(500).json({ error: 'Error searching submissions' });
    }
};

// Bulk download resumes
export const bulkDownload = async (req, res) => {
    try {
        // Validate CSRF token
        const csrfToken = req.cookies._csrf;
        const headerToken = req.body._csrf;

        if (!csrfToken || !headerToken || csrfToken !== headerToken) {
            Logger.warn('Invalid CSRF token in bulk download');
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }

        // Parse submission IDs
        const submissionIds = JSON.parse(req.body.ids);
        if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
            return res.status(400).json({ error: 'No submissions selected' });
        }

        Logger.info('Starting bulk download for submissions:', {
            count: submissionIds.length,
            ids: submissionIds
        });

        // Fetch submissions with resume file info
        const submissions = await Submission.find({
            _id: { $in: submissionIds }
        }).select('fullName resumeFile').lean();

        if (!submissions.length) {
            return res.status(404).json({ error: 'No submissions found' });
        }

        // Create new ZIP file
        const zip = new JSZip();

        // Process each submission and collect promises
        const filePromises = submissions.map(async (submission) => {
            try {
                if (!submission.resumeFile?.fileId) {
                    Logger.warn('No resume file found for submission:', submission._id);
                    return;
                }

                const fileInfo = await getFileInfo(submission.resumeFile.fileId);
                if (!fileInfo) {
                    Logger.warn('No file info found in GridFS:', submission.resumeFile.fileId);
                    return;
                }

                return new Promise((resolve, reject) => {
                    const chunks = [];
                    const downloadStream = getFileStream(submission.resumeFile.fileId);

                    downloadStream.on('data', chunk => chunks.push(chunk));
                    downloadStream.on('error', error => {
                        Logger.error('Error reading file stream:', error);
                        reject(error);
                    });
                    downloadStream.on('end', () => {
                        try {
                            const fileBuffer = Buffer.concat(chunks);

                            // Use original filename from resumeFile
                            const originalFilename = submission.resumeFile.filename;
                            
                            // If there are duplicate filenames, append a number
                            let finalFilename = originalFilename;
                            let counter = 1;
                            while (zip.files[finalFilename]) {
                                const ext = path.extname(originalFilename);
                                const nameWithoutExt = originalFilename.slice(0, -ext.length);
                                finalFilename = `${nameWithoutExt}_${counter}${ext}`;
                                counter++;
                            }

                            // Add file to ZIP
                            zip.file(finalFilename, fileBuffer);

                            Logger.info('Added file to ZIP:', {
                                submissionId: submission._id,
                                originalFilename,
                                finalFilename,
                                size: fileBuffer.length
                            });

                            resolve();
                        } catch (error) {
                            Logger.error('Error processing file:', error);
                            reject(error);
                        }
                    });
                });
            } catch (error) {
                Logger.error('Error processing file for submission:', {
                    submissionId: submission._id,
                    error: error.message
                });
                // Don't reject the promise, just log the error and continue
                return Promise.resolve();
            }
        });

        // Wait for all files to be processed
        await Promise.all(filePromises.filter(Boolean));

        // Check if any files were added to the ZIP
        if (Object.keys(zip.files).length === 0) {
            return res.status(404).json({ error: 'No valid files found to download' });
        }

        // Generate ZIP file
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });

        // Send ZIP file
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename=resumes-${Date.now()}.zip`,
            'Content-Length': zipBuffer.length
        });

        res.send(zipBuffer);
        Logger.info('Bulk download completed successfully:', {
            totalFiles: Object.keys(zip.files).length,
            zipSize: zipBuffer.length
        });
    } catch (error) {
        Logger.error('Bulk download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error processing bulk download' });
        }
    }
}; 