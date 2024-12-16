RESUME MANAGEMENT SYSTEM - INSTALLATION GUIDE

PREREQUISITES
------------
- Node.js v14 or higher
- npm v6 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor (VS Code recommended)

PROJECT STRUCTURE
----------------
resume-management-system/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   ├── index.html
│   └── admin.html
├── uploads/
├── data/
├── server.js
└── package.json

SETUP STEPS
-----------
1. Install Dependencies:
   npm install express multer

2. Default Settings:
   - Port: 3000
   - Upload Directory: ./uploads
   - Data Storage: ./data/submissions.json
   - Max File Size: 2MB
   - Allowed Files: PDF, DOC, DOCX

3. Start the Server:
   node server.js

4. Access the Application:
   - Form: http://localhost:3000
   - Admin: http://localhost:3000/admin.html

COMMON ISSUES
------------
1. Port Already in Use:
   - Find process: sudo lsof -i :3000
   - Kill process: kill -9 PID
   - Or change port in server.js

2. Server Control:
   - Start: node server.js
   - Stop: Ctrl + C

SECURITY NOTES
-------------
- Version 1.0 has no authentication
- Suitable for local/development use
- Consider adding authentication for production

For support or questions, refer to documentation or create an issue on GitHub.