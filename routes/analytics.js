/**
 * @fileoverview Analytics Routes - Dashboard and API endpoints for data visualization
 * @author Resume Screening System
 * @version 1.0.0 - Chart.js Integration
 * @description Handles analytics dashboard page and data API endpoints
 */

const express = require("express");
const router = express.Router();

// ==================== CONTROLLER IMPORTS ====================

let analyticsController;
try {
  analyticsController = require("../controllers/analyticsController");
  console.log("✅ Analytics controller loaded successfully");
} catch (error) {
  console.error("❌ Failed to load analytics controller:", error.message);
  // Fallback controller will be used
}

// ==================== ROUTE VALIDATION MIDDLEWARE ====================

/**
 * Middleware to check if analytics controller is available
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function checkAnalyticsController(req, res, next) {
  if (!analyticsController) {
    console.error("⚠️ Analytics controller not available");
    return res.status(503).json({
      success: false,
      error: "Analytics service temporarily unavailable",
      message: "Please try again later",
    });
  }
  next();
}

// ==================== DASHBOARD ROUTES ====================

/**
 * GET /analytics - Main analytics dashboard page
 * @route GET /analytics
 * @description Renders the analytics dashboard with summary statistics
 * @access Public
 */
router.get("/", checkAnalyticsController, (req, res, next) => {
  console.log("📊 Analytics dashboard requested");
  analyticsController.getAnalyticsDashboard(req, res, next);
});

// ==================== API DATA ENDPOINTS ====================

/**
 * GET /analytics/api/data - Get all analytics data for charts
 * @route GET /analytics/api/data
 * @description Returns comprehensive analytics data including:
 *   - Skills distribution
 *   - Experience breakdown
 *   - Education statistics
 *   - Monthly upload trends
 *   - Score distribution
 * @returns {Object} JSON response with analytics data
 * @access Public
 */
router.get("/api/data", checkAnalyticsController, (req, res, next) => {
  console.log("📊 Full analytics data requested");
  analyticsController.getAnalyticsData(req, res, next);
});

/**
 * GET /analytics/api/skills - Get top skills data
 * @route GET /analytics/api/skills
 * @description Returns the top 10 most common skills across all resumes
 * @returns {Object} JSON response with skills distribution
 * @access Public
 */
router.get("/api/skills", checkAnalyticsController, (req, res, next) => {
  console.log("📊 Skills data requested");
  analyticsController.getSkillsData(req, res, next);
});

/**
 * GET /analytics/api/trends - Get monthly upload trends
 * @route GET /analytics/api/trends
 * @description Returns monthly resume upload trends
 * @query {number} months - Number of months to analyze (default: 6)
 * @returns {Object} JSON response with monthly trends
 * @access Public
 */
router.get("/api/trends", checkAnalyticsController, (req, res, next) => {
  console.log("📊 Trends data requested");
  const months = req.query.months || 6;
  console.log(`📅 Analyzing ${months} months of data`);
  analyticsController.getTrendsData(req, res, next);
});

// ==================== UTILITY ROUTES ====================

/**
 * GET /analytics/health - Analytics service health check
 * @route GET /analytics/health
 * @description Checks if analytics service is operational
 * @returns {Object} JSON response with health status
 * @access Public
 */
router.get("/health", (req, res) => {
  const isHealthy = analyticsController !== null;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "unavailable",
    service: "Analytics Dashboard",
    timestamp: new Date().toISOString(),
    controller: isHealthy ? "loaded" : "not loaded",
  });
});

/**
 * GET /analytics/refresh - Trigger data refresh (future use)
 * @route GET /analytics/refresh
 * @description Placeholder for future cache refresh functionality
 * @returns {Object} JSON response
 * @access Public
 */
router.get("/refresh", checkAnalyticsController, (req, res) => {
  console.log("🔄 Analytics refresh requested");

  // Future implementation: Clear cache and reload data
  res.json({
    success: true,
    message: "Analytics data will be refreshed on next request",
    timestamp: new Date().toISOString(),
  });
});

// ==================== ERROR HANDLING ====================

/**
 * 404 handler for analytics routes
 * @description Handles requests to non-existent analytics endpoints
 */
router.use("*", (req, res) => {
  console.log(`❌ Analytics route not found: ${req.method} ${req.originalUrl}`);

  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(404).json({
      success: false,
      error: "Analytics endpoint not found",
      path: req.originalUrl,
      availableEndpoints: [
        "GET /analytics",
        "GET /analytics/api/data",
        "GET /analytics/api/skills",
        "GET /analytics/api/trends",
        "GET /analytics/health",
      ],
    });
  }

  res.status(404).render("pages/error", {
    title: "404 - Analytics Page Not Found",
    message: `The analytics page "${req.originalUrl}" could not be found.`,
    currentYear: new Date().getFullYear(),
  });
});

/**
 * Error handler for analytics routes
 * @description Catches and handles errors in analytics routes
 */
router.use((error, req, res, next) => {
  console.error("🚨 Analytics route error:", error);

  const isDevelopment = process.env.NODE_ENV === "development";

  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(error.status || 500).json({
      success: false,
      error: "Analytics request failed",
      message: isDevelopment ? error.message : "Internal server error",
      ...(isDevelopment && { stack: error.stack }),
      timestamp: new Date().toISOString(),
    });
  }

  res.status(error.status || 500).render("pages/error", {
    title: "Analytics Error",
    message: isDevelopment
      ? error.message
      : "An error occurred while loading analytics",
    currentYear: new Date().getFullYear(),
  });
});

// ==================== MODULE EXPORTS ====================

module.exports = router;
