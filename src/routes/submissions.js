import express from 'express';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Submission from '../models/submission.js';
import Logger from '../config/logger.js';
import { upload, getFileStream, getFileInfo, uploadToGridFS } from '../config/gridfs.js';

const router = express.Router();

// Create new submission with resume upload
router.post('/', upload.single('resume'), async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'Resume file is required' });
        }

        Logger.info('Starting submission process:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Upload file to GridFS
        let uploadedFile;
        try {
            uploadedFile = await uploadToGridFS(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );
            Logger.info('File uploaded successfully:', {
                fileId: uploadedFile._id.toString(),
                filename: uploadedFile.filename
            });
        } catch (uploadError) {
            Logger.error('File upload failed:', uploadError);
            throw new Error(`File upload failed: ${uploadError.message}`);
        }

        if (!uploadedFile || !uploadedFile._id) {
            throw new Error('File upload failed - no file ID received');
        }

        // Create submission object with GridFS file info
        const submission = new Submission({
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            experience: req.body.experience,
            skills: req.body.skills ? req.body.skills.split(',').map(skill => skill.trim()) : [],
            currentRole: req.body.currentRole,
            resumeFile: {
                fileId: uploadedFile._id,
                filename: uploadedFile.originalname,
                contentType: uploadedFile.mimetype
            }
        });

        // Save submission to database
        const savedSubmission = await submission.save();
        Logger.info('Submission saved successfully:', {
            submissionId: savedSubmission._id,
            fileId: uploadedFile._id.toString()
        });

        res.status(201).json({
            success: true,
            message: 'Submission received successfully',
            submission: savedSubmission.getBasicInfo()
        });
    } catch (error) {
        Logger.error('Submission error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation Error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({ 
            error: 'Error processing submission',
            message: error.message
        });
    }
});

// Download resume file
router.get('/:id/download', async (req, res) => {
    try {
        Logger.info('Download route accessed for submission ID:', req.params.id);

        // First verify authentication
        const token = req.cookies.adminToken;
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const submission = await Submission.findById(req.params.id);
        if (!submission || !submission.resumeFile) {
            Logger.error('Submission or resume file not found:', req.params.id);
            return res.status(404).json({ error: 'Submission not found' });
        }

        Logger.info('Found submission for download:', {
            submissionId: submission._id,
            fileId: submission.resumeFile.fileId.toString(),
            filename: submission.resumeFile.filename
        });

        const fileInfo = await getFileInfo(submission.resumeFile.fileId);
        if (!fileInfo) {
            Logger.error('GridFS file not found:', submission.resumeFile.fileId);
            return res.status(404).json({ error: 'Resume file not found in storage' });
        }

        res.set({
            'Content-Type': submission.resumeFile.contentType,
            'Content-Disposition': `attachment; filename="${submission.resumeFile.filename}"`,
            'Content-Length': fileInfo.length
        });

        const downloadStream = getFileStream(submission.resumeFile.fileId);
        
        downloadStream.on('error', (error) => {
            Logger.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });

        downloadStream.pipe(res);
    } catch (error) {
        Logger.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading file' });
        }
    }
});

// View resume file
router.get('/:id/view', async (req, res) => {
    try {
        Logger.info('View route accessed for submission ID:', req.params.id);

        // First verify authentication
        const token = req.cookies.adminToken;
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const submission = await Submission.findById(req.params.id);
        if (!submission || !submission.resumeFile) {
            Logger.error('Submission or resume file not found:', req.params.id);
            return res.status(404).json({ error: 'Submission not found' });
        }

        Logger.info('Found submission for viewing:', {
            submissionId: submission._id,
            fileId: submission.resumeFile.fileId.toString(),
            filename: submission.resumeFile.filename
        });

        const fileInfo = await getFileInfo(submission.resumeFile.fileId);
        if (!fileInfo) {
            Logger.error('GridFS file not found:', submission.resumeFile.fileId);
            return res.status(404).json({ error: 'Resume file not found in storage' });
        }

        res.set({
            'Content-Type': submission.resumeFile.contentType,
            'Content-Disposition': 'inline',
            'Content-Length': fileInfo.length
        });

        const downloadStream = getFileStream(submission.resumeFile.fileId);
        
        downloadStream.on('error', (error) => {
            Logger.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error streaming file' });
            }
        });

        downloadStream.pipe(res);
    } catch (error) {
        Logger.error('View error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error viewing file' });
        }
    }
});

// Test GridFS connection
router.get('/test-gridfs', async (req, res) => {
    try {
        const bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'resumes'
        });
        
        const files = await bucket.find().toArray();
        
        res.json({
            status: 'ok',
            message: 'GridFS is properly configured',
            filesCount: files.length,
            files: files.map(file => ({
                filename: file.filename,
                size: file.length,
                uploadDate: file.uploadDate
            }))
        });
    } catch (error) {
        Logger.error('GridFS test error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error testing GridFS',
            error: error.message
        });
    }
});

// Test database counts
router.get('/test-counts', async (req, res) => {
    try {
        const counts = {
            total: await Submission.countDocuments(),
            pending: await Submission.countDocuments({ status: 'pending' }),
            reviewed: await Submission.countDocuments({ status: 'reviewed' }),
            shortlisted: await Submission.countDocuments({ status: 'shortlisted' }),
            rejected: await Submission.countDocuments({ status: 'rejected' })
        };

        const submissions = await Submission.find().select('status createdAt').lean();

        res.json({
            counts,
            submissions: submissions.map(s => ({
                id: s._id,
                status: s.status,
                createdAt: s.createdAt
            }))
        });
    } catch (error) {
        Logger.error('Test counts error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 