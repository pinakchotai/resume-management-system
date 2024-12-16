import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adminSchema = new mongoose.Schema({
    username: String,
    passwordHash: String
});

const Admin = mongoose.model('Admin', adminSchema);

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete existing admins
        await Admin.deleteMany({});
        console.log('Removed existing admins');

        // Create password hash
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create new admin
        const admin = new Admin({
            username: 'admin@example.com',
            passwordHash: hash
        });

        await admin.save();
        console.log('Admin created successfully');
        console.log('Username:', admin.username);
        console.log('Password:', password);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

createAdmin(); 