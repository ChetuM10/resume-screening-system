/**
 * @fileoverview Enhanced Job Requirement Model for Multi-JD Support
 * @version 2.1.0 - Added validation and multi-JD fields
 */

const mongoose = require('mongoose');

const jobRequirementSchema = new mongoose.Schema({
  // Basic Information
  jobTitle: { 
    type: String, 
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [2, 'Job title must be at least 2 characters'],
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  
  jobDescription: { 
    type: String, 
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [10, 'Job description must be at least 10 characters']
  },
  
  // Skills Requirements
  requiredSkills: {
    type: [String],
    validate: {
      validator: function(skills) {
        return skills && skills.length > 0;
      },
      message: 'At least one required skill must be specified'
    }
  },
  
  preferredSkills: {
    type: [String],
    default: []
  },
  
  // Experience Requirements  
  experienceLevel: {
    min: {
      type: Number,
      default: 0,
      min: [0, 'Minimum experience cannot be negative'],
      max: [50, 'Minimum experience seems unrealistic']
    },
    max: {
      type: Number,
      default: 10,
      min: [0, 'Maximum experience cannot be negative'],
      max: [50, 'Maximum experience seems unrealistic']
    }
  },
  
  // Education and Location
  educationLevel: {
    type: String,
    trim: true,
    default: ''
  },
  
  location: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Salary Information
  salaryRange: {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative']
    }
  },
  
  // ✅ NEW: Multi-JD Support Fields
  jobCategory: {
    type: String,
    enum: ['network_engineer', 'full_stack_developer', 'software_developer', 'finance_intern', 'custom'],
    default: 'custom'
  },
  
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },
  
  createdBy: {
    type: String,
    default: 'System'
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ ENHANCED: Pre-save middleware for validation
jobRequirementSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Validate experience range
  if (this.experienceLevel.min > this.experienceLevel.max) {
    return next(new Error('Minimum experience cannot be greater than maximum experience'));
  }
  
  // Validate salary range
  if (this.salaryRange && this.salaryRange.min && this.salaryRange.max) {
    if (this.salaryRange.min > this.salaryRange.max) {
      return next(new Error('Minimum salary cannot be greater than maximum salary'));
    }
  }
  
  // Trim and clean skills arrays
  if (this.requiredSkills) {
    this.requiredSkills = this.requiredSkills
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);
  }
  
  if (this.preferredSkills) {
    this.preferredSkills = this.preferredSkills
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);
  }
  
  next();
});

// ✅ ENHANCED: Indexes for better performance
jobRequirementSchema.index({ jobCategory: 1 });
jobRequirementSchema.index({ status: 1 });
jobRequirementSchema.index({ createdAt: -1 });
jobRequirementSchema.index({ 'experienceLevel.min': 1, 'experienceLevel.max': 1 });

// ✅ ENHANCED: Virtual fields
jobRequirementSchema.virtual('experienceRange').get(function() {
  return `${this.experienceLevel.min}-${this.experienceLevel.max} years`;
});

jobRequirementSchema.virtual('skillCount').get(function() {
  return {
    required: this.requiredSkills?.length || 0,
    preferred: this.preferredSkills?.length || 0
  };
});

// ✅ ENHANCED: Instance methods
jobRequirementSchema.methods.toScreeningFormat = function() {
  return {
    jobTitle: this.jobTitle,
    jobDescription: this.jobDescription,
    requiredSkills: this.requiredSkills,
    minExp: this.experienceLevel.min,
    maxExp: this.experienceLevel.max,
    educationLevel: this.educationLevel,
    location: this.location,
    jobCategory: this.jobCategory
  };
};

// ✅ ENHANCED: Static methods
jobRequirementSchema.statics.getActiveJobs = function() {
  return this.find({ status: 'active' }).sort({ priority: -1, createdAt: -1 });
};

jobRequirementSchema.statics.getJobsByCategory = function(category) {
  return this.find({ jobCategory: category, status: 'active' });
};

module.exports = mongoose.model('JobRequirement', jobRequirementSchema);
