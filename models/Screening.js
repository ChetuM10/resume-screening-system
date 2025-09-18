/**
 * @fileoverview ENHANCED Screening Model with Better Multi-JD Support
 * @author Resume Screening System  
 * @version 2.2.0 - Enhanced Multi-JD support and validation
 */

const mongoose = require('mongoose');

const ScreeningSchema = new mongoose.Schema({
  // Basic Information
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [2, 'Job title must be at least 2 characters']
  },

  jobDescription: {
    type: String,
    default: ''
  },

  requiredSkills: [{
    type: String,
    required: true
  }],

  // Experience Requirements
  experienceLevel: {
    min: {
      type: Number,
      default: 0,
      min: 0
    },
    max: {
      type: Number,
      default: 50,
      min: 0
    }
  },

  // Other Requirements
  educationLevel: {
    type: String,
    default: ''
  },

  location: {
    type: String,
    default: ''
  },

  // Enhanced Screening Type Support
  screeningType: {
    type: String,
    enum: ['basic', 'advanced', 'multi-jd', 'ml-enhanced'],
    default: 'basic'
  },

  jobCategory: {
    type: String,
    enum: ['network_engineer', 'full_stack_developer', 'software_developer', 'finance_intern', 'custom', 'multi-jd'],
    default: 'custom'
  },

  // ✅ ENHANCED: Better multi-JD support
  jobCategories: [{ 
    type: String
  }],
  
  // ✅ NEW: Store original job requirements for multi-JD
  originalJobRequirements: [{
    jobTitle: String,
    jobDescription: String,
    requiredSkills: [String],
    minExp: Number,
    maxExp: Number,
    educationLevel: String,
    location: String,
    jobCategory: String
  }],

  // Enhanced Results Storage
  results: [{
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true
    },
    candidateName: {
      type: String,
      required: true
    },
    
    // ✅ FIXED: Made matchScore optional for multi-JD
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    overallRank: {
      type: Number,
      required: true,
      min: 1
    },

    // Single JD Fields
    skillsMatch: {
      type: Number,
      default: 0
    },
    matchedSkills: [String],
    missingSkills: [String],
    experienceMatch: {
      type: Boolean,
      default: false
    },
    educationMatch: {
      type: Boolean,
      default: false
    },
    reasons: [String],

    // ✅ ENHANCED: Multi-JD Fields with better structure
    bestJobMatch: {
      jobTitle: String,
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      category: String,
      reasons: [String]
    },
    
    allJobScores: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Candidate Details
    experienceYears: {
      type: Number,
      default: 0,
      min: 0
    },
    education: {
      type: String,
      default: 'Not specified'
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    skills: [String],

    // Enhanced Classification
    jobCategory: {
      type: String,
      default: 'general'
    },
    mlCategory: String,
    mlConfidence: {
      type: Number,
      min: 0,
      max: 100
    },
    relevancePenalty: {
      type: Number,
      default: 0
    },
    
    // ✅ NEW: Processing metadata
    processingError: {
      type: Boolean,
      default: false
    },
    errorDetails: String
  }],

  // ✅ ENHANCED: Statistics with better validation
  statistics: {
    totalCandidates: {
      type: Number,
      required: true,
      min: 0
    },
    qualifiedCandidates: {
      type: Number,
      default: 0,
      min: 0
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    topScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // Multi-JD Statistics
    averageBestScore: {
      type: Number,
      min: 0,
      max: 100
    },
    categoryBreakdown: [{
      category: String,
      candidateCount: {
        type: Number,
        min: 0
      },
      averageScore: {
        type: Number,
        min: 0,
        max: 100
      }
    }],

    // Score Distribution
    scoreDistribution: {
      excellent: { type: Number, default: 0, min: 0 }, // 80+
      good: { type: Number, default: 0, min: 0 },      // 60-79
      average: { type: Number, default: 0, min: 0 },   // 40-59
      poor: { type: Number, default: 0, min: 0 }       // <40
    }
  },

  // Configuration
  minimumScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },

  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },

  totalCandidates: {
    type: Number,
    required: true,
    min: 0
  },

  // Metadata
  createdBy: {
    type: String,
    default: 'System'
  },

  processingTime: {
    type: Number,
    default: 0,
    min: 0
  },

  errorCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// ✅ ENHANCED: Compound indexes for better performance
ScreeningSchema.index({ createdAt: -1 });
ScreeningSchema.index({ jobCategory: 1, screeningType: 1 });
ScreeningSchema.index({ screeningType: 1, processingStatus: 1 });
ScreeningSchema.index({ 'results.matchScore': -1 });
ScreeningSchema.index({ 'results.bestJobMatch.score': -1 });
ScreeningSchema.index({ 'statistics.averageScore': -1 });
ScreeningSchema.index({ processingStatus: 1, createdAt: -1 });

// ✅ ENHANCED: Virtual fields with validation
ScreeningSchema.virtual('qualificationRate').get(function() {
  if (!this.statistics || this.statistics.totalCandidates === 0) return 0;
  return Math.round((this.statistics.qualifiedCandidates / this.statistics.totalCandidates) * 100);
});

ScreeningSchema.virtual('avgProcessingTimePerCandidate').get(function() {
  if (!this.statistics || this.statistics.totalCandidates === 0) return 0;
  return Math.round(this.processingTime / this.statistics.totalCandidates);
});

ScreeningSchema.virtual('isMultiJD').get(function() {
  return this.screeningType === 'multi-jd';
});

// ✅ ENHANCED: Instance methods
ScreeningSchema.methods.getTopCandidates = function(limit = 10) {
  if (!this.results || this.results.length === 0) return [];
  
  return this.results
    .sort((a, b) => {
      // Sort by best job score for multi-JD, match score for single JD
      if (this.isMultiJD) {
        return (b.bestJobMatch?.score || 0) - (a.bestJobMatch?.score || 0);
      }
      return (b.matchScore || 0) - (a.matchScore || 0);
    })
    .slice(0, limit);
};

ScreeningSchema.methods.getCandidatesByCategory = function(category) {
  if (this.screeningType !== 'multi-jd' || !this.results) return [];
  
  return this.results
    .filter(candidate => candidate.bestJobMatch?.category === category)
    .sort((a, b) => (b.bestJobMatch?.score || 0) - (a.bestJobMatch?.score || 0));
};

// ✅ ENHANCED: Better statistics calculation
ScreeningSchema.methods.updateStatistics = function() {
  if (!this.results || this.results.length === 0) return;

  if (this.screeningType === 'multi-jd') {
    // Multi-JD statistics
    const bestScores = this.results.map(r => r.bestJobMatch?.score || 0);
    const averageBestScore = bestScores.length > 0 
      ? Math.round(bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length)
      : 0;
    
    const qualifiedCandidates = bestScores.filter(score => score >= (this.minimumScore || 50)).length;
    
    // Category breakdown
    const categoryMap = new Map();
    this.results.forEach(candidate => {
      const category = candidate.bestJobMatch?.category || 'unknown';
      const score = candidate.bestJobMatch?.score || 0;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, totalScore: 0 });
      }
      
      const data = categoryMap.get(category);
      data.count++;
      data.totalScore += score;
    });
    
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      candidateCount: data.count,
      averageScore: Math.round(data.totalScore / data.count)
    }));

    this.statistics = {
      ...this.statistics,
      totalCandidates: this.results.length,
      qualifiedCandidates,
      averageBestScore,
      categoryBreakdown,
      topScore: Math.max(...bestScores)
    };
  } else {
    // Single JD statistics
    const scores = this.results.map(r => r.matchScore || 0);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const qualifiedCandidates = scores.filter(score => score >= (this.minimumScore || 50)).length;

    this.statistics = {
      ...this.statistics,
      totalCandidates: this.results.length,
      averageScore,
      topScore,
      qualifiedCandidates,
      scoreDistribution: {
        excellent: scores.filter(s => s >= 80).length,
        good: scores.filter(s => s >= 60 && s < 80).length,
        average: scores.filter(s => s >= 40 && s < 60).length,
        poor: scores.filter(s => s < 40).length
      }
    };
  }
};

// ✅ ENHANCED: Static methods
ScreeningSchema.statics.getRecentScreenings = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('jobTitle screeningType totalCandidates statistics.averageScore statistics.averageBestScore createdAt jobCategory processingStatus');
};

ScreeningSchema.statics.getMultiJDScreenings = function() {
  return this.find({ screeningType: 'multi-jd' })
    .sort({ createdAt: -1 })
    .select('jobTitle jobCategories statistics createdAt');
};

ScreeningSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalScreenings: { $sum: 1 },
        multiJDScreenings: { 
          $sum: { $cond: [{ $eq: ['$screeningType', 'multi-jd'] }, 1, 0] } 
        },
        averageScore: { $avg: '$statistics.averageScore' },
        totalCandidates: { $sum: '$statistics.totalCandidates' },
        averageProcessingTime: { $avg: '$processingTime' }
      }
    }
  ]);
};

// ✅ ENHANCED: Pre-save middleware with better validation
ScreeningSchema.pre('save', function(next) {
  if (this.isModified('results')) {
    // Update statistics automatically
    this.updateStatistics();
    
    // Calculate processing time if not set
    if (!this.processingTime && this.createdAt) {
      this.processingTime = Date.now() - this.createdAt.getTime();
    }
    
    // Calculate error count
    this.errorCount = this.results?.filter(r => r.processingError).length || 0;
    
    // Update total candidates
    this.totalCandidates = this.results?.length || 0;
    
    // Set processing status
    if (this.processingStatus === 'processing') {
      this.processingStatus = this.errorCount === this.totalCandidates ? 'failed' : 'completed';
    }
  }
  
  // Validate multi-JD specific requirements
  if (this.screeningType === 'multi-jd') {
    if (!this.jobCategories || this.jobCategories.length === 0) {
      return next(new Error('Multi-JD screening must have at least one job category'));
    }
  }
  
  next();
});

module.exports = mongoose.model('Screening', ScreeningSchema);
