# Resume Management System 📄

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14-brightgreen)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-%3E%3D4.4-green)](https://www.mongodb.com/)

A modern, secure, and efficient system for managing resume submissions and job applications. Built with Node.js, Express, and MongoDB.

## ✨ Features

- 📝 Public resume submission form
- 🔒 Secure admin dashboard
- 📁 File upload with validation
- 📊 Status tracking system
- 🔐 JWT authentication
- 📱 Responsive design

## 🚀 Quick Start

1. Clone the repository
```bash
git clone https://github.com/yourusername/resume-management-system.git
cd resume-management-system
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB
```bash
# Make sure MongoDB is running on your system
```

5. Start the application
```bash
npm start
```

## 🔧 Technology Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT, bcrypt
- **Frontend**: Vanilla JavaScript
- **File Handling**: Multer

## 📖 Documentation

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.
For detailed documentation, check the [docs](docs/) directory.

## 🔐 Security

- HTTP-only cookies
- Password hashing
- Protected routes
- File validation
- Environment configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Node.js](https://nodejs.org/) 

## Admin Features

- Secure login system with rate limiting
- Dashboard with submission statistics
- View and manage submissions
- Session management
- CSRF protection
- Security headers

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```
4. Set up your MongoDB database
5. Start the server:
```bash
npm start
```

## Environment Variables

Key environment variables:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT tokens
- `SESSION_SECRET`: Secret for session management
- `ADMIN_PASSWORD_HASH`: Bcrypt hash of admin password
- `ADMIN_EMAIL`: Admin email address

See `.env.example` for all available options.

## Security Features

- JWT-based authentication
- Session management
- Rate limiting
- CSRF protection
- Security headers
- Cookie security
- Input validation
- File upload restrictions

## API Endpoints

### Public Endpoints
- `POST /api/submissions`: Submit a resume
- `GET /`: Home page
- `GET /api/health`: Health check

### Admin Endpoints
- `GET /admin/login`: Admin login page
- `POST /admin/login`: Admin login
- `GET /admin/dashboard`: Admin dashboard
- `GET /admin/submissions/:id`: View submission
- `POST /admin/logout`: Admin logout

## Development

Run in development mode:
```bash
npm run dev
```

## Production

Run in production mode:
```bash
npm run prod
```

## License

See LICENSE file for details.