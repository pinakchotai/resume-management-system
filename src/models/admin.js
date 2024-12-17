import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    passwordHash: {
        type: String,
        required: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Pre-save middleware to handle password hashing
adminSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Method to validate password
adminSchema.methods.validatePassword = async function(password) {
    if (this.password) {
        return await bcrypt.compare(password, this.password);
    } else if (this.passwordHash) {
        return await bcrypt.compare(password, this.passwordHash);
    }
    return false;
};

// Method to handle failed login attempt
adminSchema.methods.handleFailedLogin = async function() {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) { // Lock after 5 failed attempts
        this.isLocked = true;
    }
    await this.save();
};

// Method to handle successful login
adminSchema.methods.handleSuccessfulLogin = async function() {
    this.loginAttempts = 0;
    this.lastLogin = new Date();
    this.isLocked = false;
    await this.save();
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin; 