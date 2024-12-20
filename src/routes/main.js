import express from 'express';
import Logger from '../config/logger.js';

const router = express.Router();

// Home page (landing page)
router.get('/', function(req, res) {
    Logger.info('Rendering home page');
    res.render('home', { 
        title: 'Home',
        currentPage: 'home',
        style: '',
        script: '',
        layout: 'layouts/main'
    });
});

// Submit Resume page
router.get('/submit', function(req, res) {
    Logger.info('Rendering submit page');
    res.render('submit', {
        title: 'Submit Resume',
        currentPage: 'submit',
        style: '',
        script: '',
        layout: 'layouts/main'
    });
});

// About page
router.get('/about', function(req, res) {
    Logger.info('Rendering about page');
    res.render('about', {
        title: 'About Us',
        currentPage: 'about',
        style: '',
        script: '',
        layout: 'layouts/main'
    });
});

// Redirect /aboutus to /about
router.get('/aboutus', function(req, res) {
    Logger.info('Redirecting /aboutus to /about');
    res.redirect('/about');
});

// Contact page
router.get('/contact', function(req, res) {
    Logger.info('Rendering contact page');
    res.render('contact', {
        title: 'Contact Us',
        currentPage: 'contact',
        style: '',
        script: '',
        layout: 'layouts/main'
    });
});

// Contact form submission
router.post('/api/contact', async function(req, res) {
    try {
        const { name, email, subject, message } = req.body;
        
        // Here you would typically:
        // 1. Validate the input
        // 2. Save to database
        // 3. Send notification email
        // 4. Handle any errors
        
        // For now, we'll just log it
        Logger.info('Contact form submission:', {
            name,
            email,
            subject,
            message
        });

        res.json({ success: true, message: 'Message received' });
    } catch (error) {
        Logger.error('Contact form error:', error);
        res.status(500).json({ error: 'Error processing your message' });
    }
});

export default router; 