const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const dataFile = path.join(__dirname, 'data', 'submissions.json');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Initialize data storage
async function initializeStorage() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        try {
            await fs.access(dataFile);
        } catch {
            await fs.writeFile(dataFile, '[]');
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}

// Get all submissions
app.get('/api/submissions', async (req, res) => {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error reading submissions' });
    }
});

// Submit new resume
app.post('/api/submit', upload.single('resume'), async (req, res) => {
    try {
        const { fullName, email, phone, experience } = req.body;
        const resume = req.file;

        if (!resume) {
            return res.status(400).json({ error: 'No resume file uploaded' });
        }

        const submission = {
            id: Date.now(),
            fullName,
            email,
            phone,
            experience,
            resumePath: resume.path,
            fileName: resume.originalname,
            submittedAt: new Date().toISOString()
        };

        const data = await fs.readFile(dataFile, 'utf8');
        const submissions = JSON.parse(data);
        submissions.push(submission);
        await fs.writeFile(dataFile, JSON.stringify(submissions, null, 2));

        res.json({ success: true, submission });
    } catch (error) {
        res.status(500).json({ error: 'Error saving submission' });
    }
});

// Download resume
// Update the download endpoint
app.get('/api/resume/:id', async (req, res) => {
    try {
        const submissionId = parseInt(req.params.id);
        const data = await fs.readFile(dataFile, 'utf8');
        const submissions = JSON.parse(data);
        const submission = submissions.find(s => s.id === submissionId);

        if (!submission) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        try {
            // Check if file exists
            await fs.access(submission.resumePath);
            
            // Set proper headers
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${submission.fileName}"`);
            
            // Send file
            res.download(submission.resumePath, submission.fileName);
        } catch (error) {
            console.error('File access error:', error);
            res.status(404).json({ error: 'Resume file not found on server' });
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Error downloading resume' });
    }
});

// Initialize storage and start server
initializeStorage().then(() => {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
});