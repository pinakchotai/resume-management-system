/**
 * Submission Model
 * Defines the schema for resume submissions
 */

import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    experience: {
        type: Number,
        required: [true, 'Years of experience is required'],
        min: [0, 'Experience cannot be negative']
    },
    skills: {
        type: [{
            type: String,
            lowercase: true,
            trim: true,
            minlength: [2, 'Skill tag must be at least 2 characters long'],
            maxlength: [30, 'Skill tag cannot exceed 30 characters']
        }],
        validate: {
            validator: function(skills) {
                // Check for duplicates
                const uniqueSkills = new Set(skills);
                return uniqueSkills.size === skills.length;
            },
            message: 'Duplicate skills are not allowed'
        },
        index: true
    },
    currentRole: {
        type: String,
        trim: true
    },
    resumeFile: {
        fileId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Resume file ID is required']
        },
        filename: {
            type: String,
            required: [true, 'Original filename is required']
        },
        contentType: {
            type: String,
            required: [true, 'File content type is required']
        }
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'shortlisted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Add text index for full-text search on skills
submissionSchema.index({ skills: 'text' });

// Instance method to format submission details
submissionSchema.methods.getBasicInfo = function() {
    return {
        id: this._id,
        name: this.fullName,
        email: this.email,
        status: this.status,
        skills: this.skills,
        submittedDate: this.createdAt
    };
};

// Static method to find submissions by skills
submissionSchema.statics.findBySkills = function(skills, options = {}) {
    const query = skills ? { skills: { $all: skills.map(skill => skill.toLowerCase()) } } : {};
    return this.find(query)
        .sort(options.sort || { createdAt: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 10);
};

// Static method to find recent submissions
submissionSchema.statics.findRecent = function(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.find({
        createdAt: { $gte: date }
    }).sort({ createdAt: -1 });
};

// Static method to get skill statistics
submissionSchema.statics.getSkillStats = async function() {
    return this.aggregate([
        { $unwind: '$skills' },
        { 
            $group: {
                _id: '$skills',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Pre-remove middleware to delete associated file
submissionSchema.pre('remove', async function(next) {
    try {
        if (this.resumeFile && this.resumeFile.fileId) {
            const { deleteFile } = await import('../config/gridfs.js');
            await deleteFile(this.resumeFile.fileId);
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Create the model
const Submission = mongoose.model('Submission', submissionSchema);

export default Submission; 