const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function generateSecureEnv() {
    // Generate JWT Secret
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    
    // Generate Cookie Secret
    const cookieSecret = crypto.randomBytes(32).toString('hex');
    
    // Hash Admin Password
    const password = process.argv[2] || 'defaultSecurePassword123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    console.log(`JWT_SECRET=${jwtSecret}`);
    console.log(`COOKIE_SECRET=${cookieSecret}`);
    console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
}

generateSecureEnv(); 