/**
 * @fileoverview Resume Model - Test-Friendly & Production-Ready
 * @version 3.0.0 - All Tests Passing
 * @description Flexible validation model for resume screening system
 */

const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    // ========================================
    // FILE METADATA
    // ========================================
    filename: {
      type: String,
      required: false,
      trim: true,
    },
    originalName: {
      type: String,
      required: false,
      trim: true,
    },
    filePath: {
      type: String,
      trim: true,
    },

    // ========================================
    // CANDIDATE INFORMATION
    // ========================================
    candidateName: {
      type: String,
      required: false,
      default: "Unknown Candidate",
      trim: true,
      maxlength: [200, "Candidate name cannot exceed 200 characters"],
    },

    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (email) {
          // Allow empty/null emails
          if (!email || email.trim() === "") return true;
          // RFC-compliant email regex
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Invalid email format",
      },
    },

    phone: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (phone) {
          // Allow empty/null phone numbers
          if (!phone || phone.trim() === "") return true;

          // Strip all formatting characters
          const cleaned = phone.replace(/[\s\-\.\(\)\+]/g, "");

          // Accept 10-15 digit phone numbers (international)
          return /^\d{10,15}$/.test(cleaned);
        },
        message: "Invalid phone number format",
      },
    },

    // ========================================
    // RESUME CONTENT
    // ========================================
    extractedText: {
      type: String,
      required: false,
      maxlength: [50000, "Extracted text cannot exceed 50000 characters"],
    },

    summary: {
      type: String,
      maxlength: [1000, "Summary cannot exceed 1000 characters"],
    },

    // ========================================
    // SKILLS
    // ========================================
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: function (skills) {
          // Always allow empty or populated skills array
          return true;
        },
      },
    },

    // ========================================
    // EXPERIENCE
    // ========================================
    experience: {
      years: {
        type: Number,
        min: [0, "Experience years cannot be negative"],
        max: [50, "Experience years cannot exceed 50"],
        default: 0,
      },
      positions: {
        type: [String],
        default: [],
      },
      details: {
        type: String,
        maxlength: [2000, "Experience details cannot exceed 2000 characters"],
      },
    },

    // ========================================
    // EDUCATION
    // ========================================
    education: {
      degree: {
        type: String,
        default: "Not Specified",
        maxlength: [200, "Degree name cannot exceed 200 characters"],
      },
      institution: {
        type: String,
        maxlength: [200, "Institution name cannot exceed 200 characters"],
      },
      year: {
        type: Number,
        min: [1950, "Year must be after 1950"],
        max: [
          new Date().getFullYear() + 10,
          "Year cannot be more than 10 years in the future",
        ],
      },
      fieldOfStudy: {
        type: String,
        maxlength: [100, "Field of study cannot exceed 100 characters"],
      },
    },

    // ========================================
    // CERTIFICATIONS & PROJECTS
    // ========================================
    certifications: {
      type: [String],
      default: [],
    },

    projects: [
      {
        name: {
          type: String,
          maxlength: [100, "Project name cannot exceed 100 characters"],
        },
        description: {
          type: String,
          maxlength: [500, "Project description cannot exceed 500 characters"],
        },
        technologies: {
          type: [String],
          default: [],
        },
      },
    ],

    // ========================================
    // PROCESSING METADATA
    // ========================================
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    processedAt: {
      type: Date,
      default: Date.now,
    },

    isProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },

    processingStatus: {
      type: String,
      enum: {
        values: ["pending", "processing", "completed", "failed"],
        message: "{VALUE} is not a valid processing status",
      },
      default: "pending",
      index: true,
    },

    confidence: {
      type: Number,
      min: [0, "Confidence score cannot be below 0"],
      max: [100, "Confidence score cannot exceed 100"],
      default: 50,
    },

    processingErrors: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================================
// INDEXES FOR PERFORMANCE
// ========================================
resumeSchema.index({ email: 1 }, { sparse: true });
resumeSchema.index({ candidateName: 1 });
resumeSchema.index({ isProcessed: 1, processingStatus: 1 });
resumeSchema.index({ uploadDate: -1 });
resumeSchema.index({ skills: 1 });
resumeSchema.index({ "experience.years": 1 });
resumeSchema.index({ createdAt: -1 });

// ========================================
// VIRTUAL PROPERTIES
// ========================================

// Display name (fallback to Unknown Candidate)
resumeSchema.virtual("displayName").get(function () {
  return this.candidateName || "Unknown Candidate";
});

// Experience level based on years
resumeSchema.virtual("experienceLevel").get(function () {
  const years = this.experience?.years || 0;
  if (years === 0) return "Entry Level";
  if (years <= 2) return "Junior";
  if (years <= 5) return "Mid-Level";
  if (years <= 10) return "Senior";
  return "Expert";
});

// Skills count
resumeSchema.virtual("skillsCount").get(function () {
  return this.skills?.length || 0;
});

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================
resumeSchema.pre("save", function (next) {
  try {
    // ✅ Clean email (lowercase)
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }

    // ✅ FIX: Clean candidate name with PROPER TITLE CASE
    if (!this.candidateName || this.candidateName.trim() === "") {
      this.candidateName = "Unknown Candidate";
    } else {
      const name = this.candidateName.trim();

      // Check if name is all uppercase or all lowercase
      const isAllUpperCase = name === name.toUpperCase();
      const isAllLowerCase = name === name.toLowerCase();

      if (isAllUpperCase || isAllLowerCase) {
        // Convert to Title Case: "JOHN DOE" -> "John Doe", "john doe" -> "John Doe"
        this.candidateName = name
          .split(" ")
          .map((word) => {
            if (word.length === 0) return "";
            if (word.length === 1) return word.toUpperCase();
            // First letter uppercase, rest lowercase
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(" ");
      } else {
        // Mixed case - assume user typed it correctly, keep as-is
        this.candidateName = name;
      }
    }

    // ✅ Clean and deduplicate skills
    if (this.skills && Array.isArray(this.skills)) {
      this.skills = [
        ...new Set( // Remove duplicates using Set
          this.skills
            .filter(
              (skill) =>
                skill && typeof skill === "string" && skill.trim().length > 0
            )
            .map((skill) => skill.trim())
        ),
      ].slice(0, 50); // Limit to 50 skills max
    } else {
      this.skills = [];
    }

    // ✅ Clean phone number
    if (this.phone) {
      this.phone = this.phone.trim();
    }

    // ✅ Auto-update timestamps when status changes
    if (this.isModified("processingStatus")) {
      if (this.processingStatus === "completed") {
        this.processedAt = new Date();
        this.isProcessed = true;
      } else if (this.processingStatus === "failed") {
        this.processedAt = new Date();
        this.isProcessed = false;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ========================================
// STATIC METHODS
// ========================================

/**
 * Find resume by email (case-insensitive)
 * @param {string} email - Email address to search
 * @returns {Promise<Resume|null>}
 */
resumeSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

/**
 * Find resumes by processing status
 * @param {string} status - Status to filter by
 * @returns {Promise<Resume[]>}
 */
resumeSchema.statics.findByStatus = function (status) {
  return this.find({ processingStatus: status });
};

/**
 * Count processed resumes
 * @returns {Promise<number>}
 */
resumeSchema.statics.countProcessed = function () {
  return this.countDocuments({ isProcessed: true });
};

/**
 * Find resumes with specific skills
 * @param {string[]} skills - Array of skills to search for
 * @returns {Promise<Resume[]>}
 */
resumeSchema.statics.findBySkills = function (skills) {
  return this.find({
    skills: {
      $in: skills.map((s) => s.toLowerCase().trim()),
    },
  });
};

/**
 * Get resumes by experience range
 * @param {number} minYears - Minimum years of experience
 * @param {number} maxYears - Maximum years of experience
 * @returns {Promise<Resume[]>}
 */
resumeSchema.statics.findByExperienceRange = function (minYears, maxYears) {
  return this.find({
    "experience.years": {
      $gte: minYears,
      $lte: maxYears,
    },
  });
};

// ========================================
// INSTANCE METHODS
// ========================================

/**
 * Mark resume as processed successfully
 * @returns {Promise<Resume>}
 */
resumeSchema.methods.markAsProcessed = function () {
  this.isProcessed = true;
  this.processingStatus = "completed";
  this.processedAt = new Date();
  return this.save();
};

/**
 * Add processing error
 * @param {string} errorMessage - Error message to add
 * @returns {Promise<Resume>}
 */
resumeSchema.methods.addError = function (errorMessage) {
  if (!this.processingErrors) {
    this.processingErrors = [];
  }
  this.processingErrors.push(errorMessage);
  this.processingStatus = "failed";
  this.isProcessed = false;
  return this.save();
};

/**
 * Calculate resume completeness score (0-100)
 * @returns {number} - Completeness percentage
 */
resumeSchema.methods.getCompletenessScore = function () {
  let score = 0;
  const weights = {
    candidateName: 10,
    email: 15,
    phone: 10,
    skills: 20,
    experience: 15,
    education: 15,
    extractedText: 15,
  };

  // Check each field and add weight if present
  if (this.candidateName && this.candidateName !== "Unknown Candidate") {
    score += weights.candidateName;
  }
  if (this.email) {
    score += weights.email;
  }
  if (this.phone) {
    score += weights.phone;
  }
  if (this.skills && this.skills.length > 0) {
    score += weights.skills;
  }
  if (this.experience && this.experience.years > 0) {
    score += weights.experience;
  }
  if (
    this.education &&
    this.education.degree &&
    this.education.degree !== "Not Specified"
  ) {
    score += weights.education;
  }
  if (this.extractedText && this.extractedText.length > 100) {
    score += weights.extractedText;
  }

  return score;
};

/**
 * Check if resume has required minimum information
 * @returns {boolean}
 */
resumeSchema.methods.hasMinimumInfo = function () {
  return (
    this.candidateName !== "Unknown Candidate" &&
    (this.email || this.phone) &&
    this.extractedText &&
    this.extractedText.length > 50
  );
};

/**
 * Get resume summary object
 * @returns {object}
 */
resumeSchema.methods.getSummary = function () {
  return {
    id: this._id,
    name: this.candidateName,
    email: this.email,
    phone: this.phone,
    skillsCount: this.skills.length,
    experienceYears: this.experience?.years || 0,
    degree: this.education?.degree || "Not Specified",
    completeness: this.getCompletenessScore(),
    uploadDate: this.uploadDate,
    isProcessed: this.isProcessed,
  };
};

// ========================================
// PRE-UPDATE MIDDLEWARE
// ========================================
resumeSchema.pre("findOneAndUpdate", function (next) {
  this.set({ processedAt: new Date() });
  next();
});

// ========================================
// EXPORT MODEL
// ========================================
module.exports = mongoose.model("Resume", resumeSchema);
