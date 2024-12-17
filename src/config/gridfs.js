import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Logger from './logger.js';
import { GridFSBucket } from 'mongodb';

// Initialize GridFS bucket
let gridfsBucket;
mongoose.connection.once('open', () => {
    gridfsBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'resumes'
    });
    Logger.info('GridFS bucket initialized');
});

// Create memory storage for temporary file handling
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
};

// Create multer upload middleware
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // default 5MB
    }
});

// Function to upload file to GridFS
const uploadToGridFS = async (fileBuffer, originalname, mimetype) => {
    if (!gridfsBucket) {
        throw new Error('GridFS bucket not initialized');
    }

    return new Promise((resolve, reject) => {
        try {
            const filename = crypto.randomBytes(16).toString('hex') + path.extname(originalname);
            Logger.info('Starting file upload to GridFS:', { filename, originalname });
            
            const uploadStream = gridfsBucket.openUploadStream(filename, {
                metadata: {
                    originalname,
                    mimetype,
                    uploadDate: new Date()
                }
            });

            // Handle upload events
            uploadStream.once('error', (error) => {
                Logger.error('Error in GridFS upload stream:', error);
                reject(error);
            });

            uploadStream.once('finish', function() {
                const fileId = this.id; // Get the file ID from the upload stream
                Logger.info('File upload completed:', {
                    fileId: fileId.toString(),
                    filename: filename
                });
                resolve({
                    _id: fileId,
                    filename: filename,
                    originalname: originalname,
                    mimetype: mimetype
                });
            });

            // Write the file buffer to GridFS
            uploadStream.write(fileBuffer);
            uploadStream.end();
        } catch (error) {
            Logger.error('Error in uploadToGridFS:', error);
            reject(error);
        }
    });
};

// Function to get file stream by ID
const getFileStream = (fileId) => {
    if (!gridfsBucket) {
        throw new Error('GridFS bucket not initialized');
    }
    try {
        const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
        Logger.info('Creating download stream for file:', { fileId: id.toString() });
        
        const downloadStream = gridfsBucket.openDownloadStream(id);
        
        // Add error handler to the stream
        downloadStream.on('error', (error) => {
            Logger.error('Error in download stream:', error);
            throw error;
        });

        return downloadStream;
    } catch (error) {
        Logger.error('Error creating file stream:', error);
        throw error;
    }
};

// Function to delete file by ID
const deleteFile = async (fileId) => {
    if (!gridfsBucket) {
        throw new Error('GridFS bucket not initialized');
    }
    try {
        const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
        Logger.info('Deleting file:', { fileId: id.toString() });
        await gridfsBucket.delete(id);
    } catch (error) {
        Logger.error('Error deleting file:', error);
        throw error;
    }
};

// Function to get file info by ID
const getFileInfo = async (fileId) => {
    if (!gridfsBucket) {
        throw new Error('GridFS bucket not initialized');
    }
    try {
        const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
        Logger.info('Getting file info:', { fileId: id.toString() });
        
        // First try to get the file info directly
        const cursor = gridfsBucket.find({ _id: id });
        const files = await cursor.toArray();
        
        if (!files || files.length === 0) {
            Logger.error('File not found:', { fileId: id.toString() });
            return null;
        }
        
        const fileInfo = files[0];
        Logger.info('File info retrieved:', {
            fileId: id.toString(),
            filename: fileInfo.filename,
            length: fileInfo.length,
            uploadDate: fileInfo.uploadDate
        });
        
        return fileInfo;
    } catch (error) {
        Logger.error('Error getting file info:', error);
        throw error;
    }
};

export {
    upload,
    uploadToGridFS,
    getFileStream,
    deleteFile,
    getFileInfo
}; 