/**
 * Submission Model
 * Defines the schema for resume submissions
 */

import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
            'Please enter a valid email address'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [
            /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
            'Please enter a valid phone number'
        ]
    },
    experience: {
        type: Number,
        required: [true, 'Years of experience is required'],
        min: [0, 'Experience cannot be negative'],
        max: [50, 'Experience cannot exceed 50 years']
    },
    skills: [{
        type: String,
        trim: true
    }],
    currentRole: {
        type: String,
        trim: true,
        maxlength: [100, 'Current role cannot exceed 100 characters']
    },
    resumePath: {
        type: String,
        required: [true, 'Resume file path is required']
    },
    fileName: {
        type: String,
        required: [true, 'Original file name is required']
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'reviewed', 'shortlisted', 'rejected'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true }, // Ensures virtuals are included when document is converted to JSON
    toObject: { virtuals: true }
});

// Virtual for formatted date
submissionSchema.virtual('submittedDate').get(function() {
    return this.createdAt.toLocaleDateString();
});

// Index for improved query performance
submissionSchema.index({ email: 1 }, { unique: true });
submissionSchema.index({ status: 1 });
submissionSchema.index({ createdAt: -1 });

// Pre-save middleware to trim strings
submissionSchema.pre('save', function(next) {
    if (this.skills && Array.isArray(this.skills)) {
        this.skills = this.skills.map(skill => skill.trim());
    }
    next();
});

// Instance method to format submission details
submissionSchema.methods.getBasicInfo = function() {
    return {
        id: this._id,
        name: this.fullName,
        email: this.email,
        status: this.status,
        submittedDate: this.submittedDate
    };
};

// Static method to find recent submissions
submissionSchema.statics.findRecent = function(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.find({
        createdAt: { $gte: date }
    }).sort({ createdAt: -1 });
};

// Create the model
const Submission = mongoose.model('Submission', submissionSchema);

export default Submission; 