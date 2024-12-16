import multer from 'multer';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Development storage configuration
const devStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Production storage configuration (memory storage for cloud upload)
const prodStorage = multer.memoryStorage();

// Configure multer based on environment
const storage = isProduction ? prodStorage : devStorage;

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'));
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // default 5MB
    },
    fileFilter: fileFilter
});

export default upload; 