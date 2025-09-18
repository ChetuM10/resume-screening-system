/**
 * @fileoverview FIXED Resume Model - No Blocking Validation
 */

const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  
  // ✅ CRITICAL FIX: Remove validation that blocks saves
  candidateName: {
    type: String,
    required: true,
    default: 'Unknown Candidate'
    // Removed problematic validator
  },
  
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        if (!email) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  
  phone: {
    type: String,
    validate: {
      validator: function(phone) {
        if (!phone) return true;
        const cleaned = phone.replace(/[\-\.\s+]/g, '');
        return /^[6-9]\d{9}$/.test(cleaned);
      },
      message: 'Invalid phone number format'
    }
  },
  
  extractedText: {
    type: String,
    required: true,
    maxlength: 20000
  },
  
  // ✅ FIX: Remove skills validation
  skills: {
    type: [String],
    default: []
    // Removed validator that required skills.length > 0
  },
  
  experience: {
    years: { type: Number, min: 0, max: 50, default: 0 },
    positions: { type: [String], default: [] }
  },
  
  education: {
    degree: { type: String, default: 'Not Specified' },
    institution: String,
    year: Number
  },
  
  uploadDate: { type: Date, default: Date.now },
  processedAt: { type: Date, default: Date.now },
  isProcessed: { type: Boolean, default: true },
  confidence: { type: Number, min: 0, max: 100, default: 50 },
  processingErrors: { type: [String], default: [] }
});

// Indexes
resumeSchema.index({ email: 1 }, { sparse: true });
resumeSchema.index({ candidateName: 1 });
resumeSchema.index({ isProcessed: 1 });
resumeSchema.index({ uploadDate: -1 });

// ✅ FIX: Allow all names in pre-save
resumeSchema.pre('save', function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  // Allow any candidateName including "Unknown Candidate"
  if (!this.candidateName || this.candidateName.trim() === '') {
    this.candidateName = 'Unknown Candidate';
  } else {
    this.candidateName = this.candidateName.trim();
  }

  // Clean skills array
  if (this.skills && Array.isArray(this.skills)) {
    this.skills = this.skills
      .filter(skill => skill && skill.trim().length > 0)
      .map(skill => skill.trim().toLowerCase())
      .slice(0, 25);
  } else {
    this.skills = [];
  }

  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
