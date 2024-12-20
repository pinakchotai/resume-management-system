# Resume Management System v1.0.4

This release focuses on improving the project structure, adding new features, and enhancing the overall stability and security of the application.

## Major Changes

### Project Structure Improvements
- Reorganized entire codebase to follow industry standards
- Moved all source files to `src` directory
- Improved code modularity and maintainability
- Updated import paths to match new structure

### New Features
- Added Excel export functionality for submissions
  - Export all submissions to Excel with formatted columns
  - Includes all submission data except resume files
  - Professional formatting with proper column widths
- Added rate limiting middleware for API protection
  - Configurable rate limits through environment variables
  - Protection against brute force attacks
  - Customizable error messages

### Enhanced Error Handling
- Added proper error handling and notifications for status updates
- Improved form validation feedback
- Better file upload validation messages
- Enhanced error logging across the application

## Bug Fixes
- Fixed CSRF token handling in bulk downloads
- Fixed status update UI feedback
- Fixed file upload validation messages
- Fixed form submission handling

## Technical Details

### Dependencies Added
- Added `xlsx` package for Excel export functionality
- Added `express-rate-limit` for API protection

### File Structure
```
resume-management-system/
├── src/                      # Source code directory
│   ├── config/              # Configuration files
│   ├── controllers/         # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Database models
│   ├── routes/            # Route definitions
│   ├── views/            # EJS templates
│   └── public/           # Static files
├── scripts/             # Utility scripts
└── logs/               # Application logs
```

### Environment Variables
Added new environment variables:
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## Breaking Changes
- All import paths need to be updated to use the new `src` directory structure
- Rate limiting is now enabled by default

## Upgrade Instructions
1. Pull the latest changes
2. Run `npm install` to install new dependencies
3. Update any custom import paths to use the new `src` directory
4. Review and update environment variables if needed
5. Restart the server

## Contributors
- Pinak Chotai 