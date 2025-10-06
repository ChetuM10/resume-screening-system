/**
 * @fileoverview Main Dashboard Routes - Home page and dashboard endpoints
 * Handles dashboard statistics, ML dashboard, health checks, and quick actions
 * @author Resume Screening System
 * @version 1.2.0 - Added Analytics Dashboard
 */

const express = require("express");
const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const Screening = require("../models/Screening");
const resultsController = require("../controllers/resultsController");

const router = express.Router();

// ==================== CONFIGURATION CONSTANTS ====================

/**
 * Dashboard configuration constants
 * @type {Object}
 */
const DASHBOARD_CONFIG = {
  RECENT_RESUMES_LIMIT: 5,
  RECENT_SCREENINGS_LIMIT: 3,
  ML_CATEGORIES_LIMIT: 5,
  ML_RECENT_RESULTS_LIMIT: 10,
  CACHE_TTL: 300, // 5 minutes
};

/**
 * Default dashboard statistics for fallback scenarios
 * @type {Object}
 */
const DEFAULT_STATS = {
  uploaded: 0,
  processed: 0,
  unprocessed: 0,
  screenings: 0,
  topScore: 0,
  processingRate: 0,
};

/**
 * Default ML statistics for fallback scenarios
 * @type {Object}
 */
const DEFAULT_ML_STATS = {
  classifiedResumes: 0,
  topCategories: [],
  averageConfidence: 0,
  recentResults: [],
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safe controller import with fallback
 * @type {Object|null}
 */
let homeController;
try {
  homeController = require("../controllers/homeController");
} catch (error) {
  console.log("homeController not found, using inline implementation");
  homeController = null;
}

// ✅ NEW: Analytics controller import
let analyticsController;
try {
  analyticsController = require("../controllers/analyticsController");
} catch (error) {
  console.log("analyticsController not found, will use inline implementation");
  analyticsController = null;
}

/**
 * Calculates processing rate percentage
 * @param {number} processed - Number of processed resumes
 * @param {number} total - Total number of resumes
 * @returns {number} Processing rate percentage (0-100)
 */
function calculateProcessingRate(processed, total) {
  return total > 0 ? Math.round((processed / total) * 100) : 0;
}

/**
 * Extracts top score from screening statistics
 * @param {Object|null} topScreening - Latest screening document
 * @returns {number} Top score or 0 if not available
 */
function extractTopScore(topScreening) {
  return topScreening && topScreening.statistics
    ? topScreening.statistics.topScore
    : 0;
}

/**
 * Processes query parameters for success/error messages
 * @param {Object} query - Express request query object
 * @returns {{successMessage: string|null, errorMessage: string|null}} Processed messages
 */
function processQueryMessages(query) {
  const { message, count, error } = query;
  let successMessage = null;
  let errorMessage = null;

  if (message === "upload-success" && count) {
    successMessage = `Successfully processed ${count} resume(s)!`;
  } else if (error) {
    errorMessage = error;
  }

  return { successMessage, errorMessage };
}

/**
 * Calculates average ML confidence from aggregation results
 * @param {Array} avgConfidenceResults - MongoDB aggregation results
 * @returns {number} Average confidence percentage (0-100)
 */
function calculateAverageMLConfidence(avgConfidenceResults) {
  return avgConfidenceResults.length > 0
    ? Math.round(avgConfidenceResults[0].avgConfidence * 100)
    : 0;
}

// ==================== ROUTE HANDLERS ====================

/**
 * Dashboard home page route - displays comprehensive application statistics
 * @route GET /
 */
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching dashboard statistics...");

    // Fetch comprehensive statistics in parallel for optimal performance
    const [
      uploadedCount,
      processedCount,
      unprocessedCount,
      screeningsCount,
      topScreening,
      recentResumes,
      recentScreenings,
    ] = await Promise.all([
      Resume.countDocuments({}),
      Resume.countDocuments({ isProcessed: true }),
      Resume.countDocuments({ isProcessed: false }),
      Screening.countDocuments({}),
      Screening.findOne({}).sort({ createdAt: -1 }).select("statistics"),
      Resume.find({})
        .sort({ createdAt: -1 })
        .limit(DASHBOARD_CONFIG.RECENT_RESUMES_LIMIT)
        .select("candidateName email createdAt"),
      Screening.find({})
        .sort({ createdAt: -1 })
        .limit(DASHBOARD_CONFIG.RECENT_SCREENINGS_LIMIT)
        .select("jobTitle statistics createdAt"),
    ]);

    // Calculate enhanced statistics
    const topScore = extractTopScore(topScreening);
    const processingRate = calculateProcessingRate(
      processedCount,
      uploadedCount
    );

    const stats = {
      uploaded: uploadedCount,
      processed: processedCount,
      unprocessed: unprocessedCount,
      screenings: screeningsCount,
      topScore,
      processingRate,
    };

    console.log("📊 Dashboard Statistics:");
    console.log("- Uploaded:", uploadedCount);
    console.log("- Processed:", processedCount);
    console.log("- Screenings:", screeningsCount);
    console.log("- Top Score:", topScore);

    const testResumes = await Resume.find({});
    console.log(
      "🧪 Raw database test - Total resumes found:",
      testResumes.length
    );
    if (testResumes.length > 0) {
      console.log("📄 Sample resume:", {
        id: testResumes[0]._id,
        name: testResumes[0].candidateName,
        processed: testResumes[0].isProcessed,
      });
    }

    // Process success/error messages from query parameters
    const { successMessage, errorMessage } = processQueryMessages(req.query);

    res.render("pages/index", {
      title: "Resume Screening Dashboard",
      stats,
      recentResumes,
      recentScreenings,
      successMessage,
      errorMessage,
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);

    // Render dashboard with fallback data and error message
    res.render("pages/index", {
      title: "Resume Screening Dashboard",
      stats: DEFAULT_STATS,
      recentResumes: [],
      recentScreenings: [],
      errorMessage: "Unable to load statistics. Please refresh the page.",
      currentYear: new Date().getFullYear(),
    });
  }
});

/**
 * ML Dashboard route - displays machine learning statistics and insights
 * @route GET /ml-dashboard
 */
router.get("/ml-dashboard", async (req, res) => {
  try {
    console.log("Loading ML Dashboard...");

    // Fetch ML-specific statistics in parallel
    const [mlClassifiedCount, topMlCategories, avgConfidence, recentMlResults] =
      await Promise.all([
        Resume.countDocuments({ mlCategory: { $ne: null } }),
        Resume.aggregate([
          { $match: { mlCategory: { $ne: null } } },
          { $group: { _id: "$mlCategory", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: DASHBOARD_CONFIG.ML_CATEGORIES_LIMIT },
        ]),
        Resume.aggregate([
          { $match: { mlConfidence: { $ne: null } } },
          { $group: { _id: null, avgConfidence: { $avg: "$mlConfidence" } } },
        ]),
        Resume.find({ mlCategory: { $ne: null } })
          .sort({ createdAt: -1 })
          .limit(DASHBOARD_CONFIG.ML_RECENT_RESULTS_LIMIT)
          .select("candidateName mlCategory mlConfidence createdAt"),
      ]);

    const mlStats = {
      classifiedResumes: mlClassifiedCount,
      topCategories: topMlCategories,
      averageConfidence: calculateAverageMLConfidence(avgConfidence),
      recentResults: recentMlResults,
    };

    console.log("ML Dashboard stats:", mlStats);

    res.render("pages/ml-dashboard", {
      title: "ML Dashboard",
      mlStats,
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("Error loading ML Dashboard:", error);

    // Render ML dashboard with fallback data
    res.render("pages/ml-dashboard", {
      title: "ML Dashboard",
      mlStats: DEFAULT_ML_STATS,
      errorMessage: "Unable to load ML statistics",
      currentYear: new Date().getFullYear(),
    });
  }
});

// ==================== ✅ NEW! ANALYTICS DASHBOARD ROUTE ====================

/**
 * Analytics Dashboard route - displays visual charts and data insights
 * @route GET /analytics
 */
router.get("/analytics", async (req, res) => {
  if (analyticsController && analyticsController.getAnalyticsDashboard) {
    // Use controller if available
    return analyticsController.getAnalyticsDashboard(req, res);
  }

  // Inline fallback implementation
  try {
    console.log("📊 Loading Analytics Dashboard...");

    res.render("pages/analytics", {
      title: "Analytics Dashboard",
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("❌ Error loading Analytics Dashboard:", error);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Unable to load analytics dashboard",
      currentYear: new Date().getFullYear(),
    });
  }
});

/**
 * ✅ NEW! Analytics data API endpoint
 * @route GET /api/analytics/data
 */
router.get("/api/analytics/data", async (req, res) => {
  if (analyticsController && analyticsController.getAnalyticsData) {
    return analyticsController.getAnalyticsData(req, res);
  }

  // Inline fallback - return empty data structure
  res.json({
    success: true,
    data: {
      skillsDistribution: [],
      scoreDistribution: [],
      monthlyUploads: [],
      experienceBreakdown: [],
      educationStats: [],
    },
  });
});

// ==================== CANDIDATE PROFILE ROUTE ====================

/**
 * GET route for individual candidate profile
 * @route GET /profile/:id
 */
router.get("/profile/:id", async (req, res) => {
  try {
    const candidateId = req.params.id;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(404).render("pages/error", {
        title: "Invalid ID",
        message: "Invalid candidate ID format",
        currentYear: new Date().getFullYear(),
      });
    }

    const candidate = await Resume.findById(candidateId).lean();

    if (!candidate) {
      return res.status(404).render("pages/error", {
        title: "Profile Not Found",
        message: "Candidate profile not found",
        currentYear: new Date().getFullYear(),
      });
    }

    console.log(`📋 Viewing profile: ${candidate.candidateName}`);

    res.render("pages/candidateDetail", {
      title: `${candidate.candidateName} - Profile`,
      resume: candidate,
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("Profile loading error:", error);
    res.status(500).render("pages/error", {
      title: "Server Error",
      message: "Unable to load candidate profile",
      currentYear: new Date().getFullYear(),
    });
  }
});

// ==================== RESULTS ROUTES ====================

/**
 * View screening results page
 * @route GET /results/:id
 */
router.get("/results/:id", resultsController.getScreeningResults);

/**
 * Get results as JSON API
 * @route GET /api/results/:id
 */
router.get("/api/results/:id", resultsController.getResultsJson);

/**
 * Download candidate resume text
 * @route GET /results/:id/download
 */
router.get("/results/:id/download", resultsController.downloadResume);

/**
 * Export screening results to Excel
 * @route GET /results/:id/export
 */
router.get("/results/:id/export", resultsController.exportScreeningToExcel);

// ==================== DELETE CANDIDATE API ====================

/**
 * DELETE /api/candidates/:id - Delete candidate by ID
 * @route DELETE /api/candidates/:id
 */
router.delete("/api/candidates/:id", async (req, res) => {
  try {
    const candidateId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid candidate ID format",
      });
    }

    // Delete candidate from database
    const deletedCandidate = await Resume.findByIdAndDelete(candidateId);

    if (!deletedCandidate) {
      return res.status(404).json({
        success: false,
        error: "Candidate not found",
      });
    }

    console.log(`✅ Deleted candidate: ${deletedCandidate.candidateName}`);

    res.json({
      success: true,
      message: `Successfully deleted candidate: ${deletedCandidate.candidateName}`,
      deletedId: candidateId,
    });
  } catch (error) {
    console.error("Delete candidate error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete candidate",
    });
  }
});

// ==================== API ENDPOINTS ====================

/**
 * API endpoint for dashboard statistics (AJAX updates)
 * @route GET /api/stats
 */
router.get("/api/stats", async (req, res) => {
  try {
    console.log("📡 API Stats request received");

    // Fetch current statistics for API response
    const [uploadedCount, processedCount, screeningsCount, topScreening] =
      await Promise.all([
        Resume.countDocuments({}),
        Resume.countDocuments({ isProcessed: true }),
        Screening.countDocuments({}),
        Screening.findOne({}).sort({ createdAt: -1 }).select("statistics"),
      ]);

    const topScore = extractTopScore(topScreening);

    const stats = {
      uploaded: uploadedCount,
      processed: processedCount,
      screenings: screeningsCount,
      topScore,
      processingRate: calculateProcessingRate(processedCount, uploadedCount),
    };

    console.log("📊 API Stats response:", stats);

    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching API stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Health check endpoint for monitoring and load balancers
 * @route GET /health
 */
router.get("/health", async (req, res) => {
  try {
    // Quick database connectivity check
    await Resume.findOne({}).limit(1);

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
});

// ==================== QUICK ACTION ROUTES ====================

/**
 * Quick action route to upload page
 * @route GET /quick-upload
 */
router.get("/quick-upload", (req, res) => {
  res.redirect("/upload");
});

/**
 * Quick action route to screening page
 * @route GET /quick-screen
 */
router.get("/quick-screen", (req, res) => {
  res.redirect("/screening");
});

// ==================== DEVELOPMENT UTILITIES ====================

/**
 * System information endpoint (development only)
 * @route GET /system-info
 */
router.get("/system-info", (req, res) => {
  // Security: Only available in development
  if (process.env.NODE_ENV === "production") {
    return res.status(404).send("Not found");
  }

  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ==================== MODULE EXPORTS ====================

module.exports = router;
