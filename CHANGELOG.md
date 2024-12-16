# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2023-12-16

### Added
- Modern UI design with improved user experience
- Interactive skills input with tag system
- Drag and drop file upload functionality
- Loading indicators for all actions
- Better form validation with instant feedback
- Empty state handling in admin dashboard
- Proper error messages and notifications

### Changed
- Enhanced admin dashboard layout
- Improved authentication flow
- Better mobile responsiveness
- Updated status badges design
- Refined form layouts and spacing

### Fixed
- Admin route protection issues
- File upload validation
- Authentication redirects
- Form submission feedback
- Mobile layout issues

### Security
- Protected admin HTML files
- Enhanced route protection
- Better authentication flow
- Improved file upload validation

## [1.0.0] - 2023-12-16

### Added
- Initial release of the Resume Management System
- Public resume submission form with file upload
- Admin dashboard for managing submissions
- MongoDB integration for data storage
- Secure file storage system
- Admin authentication system with JWT
- One-time admin registration system
- File upload validation and sanitization
- Submission status tracking (pending, reviewed, shortlisted, rejected)
- Download functionality for submitted resumes
- Environment-based configuration
- Security features:
  - Password hashing
  - HTTP-only cookies
  - Protected admin routes
  - File type restrictions
  - File size limits

### Security
- Implemented JWT-based authentication
- Added secure cookie handling
- Set up file upload restrictions
- Created protected admin routes
- Added environment variable configuration

### Technical
- Built with Node.js and Express
- MongoDB for database
- Vanilla JavaScript for frontend
- Responsive design for all devices
- File handling with Multer
- Password hashing with bcrypt
- JWT for session management