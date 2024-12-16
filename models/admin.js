import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    isLocked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Method to validate password
adminSchema.methods.validatePassword = async function(password) {
    return bcrypt.compare(password, this.passwordHash);
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