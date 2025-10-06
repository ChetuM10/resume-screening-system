/**
 * @fileoverview Analytics Controller - Visual data insights and statistics
 * @author Resume Screening System
 * @version 1.0.0 - Analytics Dashboard with Chart.js
 * @description Provides analytics data for charts, trends, and insights
 */

const Resume = require("../models/Resume");
const Screening = require("../models/Screening");

// ==================== CONFIGURATION ====================

const ANALYTICS_CONFIG = {
  TOP_SKILLS_LIMIT: 10,
  MONTHS_TO_ANALYZE: 6,
  EXPERIENCE_RANGES: [
    { label: "Entry Level (0-2 yrs)", min: 0, max: 2 },
    { label: "Junior (2-5 yrs)", min: 2, max: 5 },
    { label: "Mid-Level (5-10 yrs)", min: 5, max: 10 },
    { label: "Senior (10+ yrs)", min: 10, max: 50 },
  ],
  EDUCATION_LEVELS: [
    "High School",
    "Bachelor",
    "Master",
    "PhD",
    "Diploma",
    "Not Specified",
  ],
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get date range for monthly analysis
 * @param {number} months - Number of months to analyze
 * @returns {Date} Start date
 */
function getStartDate(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

/**
 * Format month name from date
 * @param {Date} date - Date object
 * @returns {string} Month name (e.g., "Jan 2025")
 */
function formatMonthName(date) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Aggregate skills from all resumes and count frequency
 * @param {Array} resumes - Array of resume documents
 * @returns {Array} Top skills with counts
 */
function aggregateSkills(resumes) {
  const skillCount = {};

  resumes.forEach((resume) => {
    if (resume.skills && Array.isArray(resume.skills)) {
      resume.skills.forEach((skill) => {
        const normalizedSkill = skill.toLowerCase().trim();
        skillCount[normalizedSkill] = (skillCount[normalizedSkill] || 0) + 1;
      });
    }
  });

  return Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, ANALYTICS_CONFIG.TOP_SKILLS_LIMIT)
    .map(([skill, count]) => ({
      skill: skill.charAt(0).toUpperCase() + skill.slice(1),
      count,
    }));
}

/**
 * Calculate experience level distribution
 * @param {Array} resumes - Array of resume documents
 * @returns {Array} Experience distribution by range
 */
function calculateExperienceDistribution(resumes) {
  const distribution = ANALYTICS_CONFIG.EXPERIENCE_RANGES.map((range) => ({
    label: range.label,
    count: 0,
  }));

  resumes.forEach((resume) => {
    const years = resume.experience?.years || 0;
    const rangeIndex = ANALYTICS_CONFIG.EXPERIENCE_RANGES.findIndex(
      (range) => years >= range.min && years < range.max
    );
    if (rangeIndex !== -1) {
      distribution[rangeIndex].count++;
    }
  });

  return distribution;
}

/**
 * Calculate education level distribution
 * @param {Array} resumes - Array of resume documents
 * @returns {Array} Education distribution
 */
function calculateEducationDistribution(resumes) {
  const educationCount = {};

  resumes.forEach((resume) => {
    const degree = resume.education?.degree || "Not Specified";
    const normalizedDegree = degree.trim();
    educationCount[normalizedDegree] =
      (educationCount[normalizedDegree] || 0) + 1;
  });

  return ANALYTICS_CONFIG.EDUCATION_LEVELS.map((level) => ({
    level,
    count: educationCount[level] || 0,
  }));
}

/**
 * Calculate monthly upload trends
 * @param {Array} resumes - Array of resume documents
 * @param {number} months - Number of months to analyze
 * @returns {Array} Monthly upload counts
 */
function calculateMonthlyTrends(resumes, months) {
  const monthlyData = [];
  const now = new Date();

  // Initialize all months with 0 count
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    monthlyData.push({
      month: formatMonthName(date),
      count: 0,
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
    });
  }

  // Count resumes per month
  resumes.forEach((resume) => {
    const uploadDate = new Date(resume.createdAt || resume.uploadDate);
    const monthIndex = monthlyData.findIndex(
      (data) =>
        data.monthIndex === uploadDate.getMonth() &&
        data.year === uploadDate.getFullYear()
    );
    if (monthIndex !== -1) {
      monthlyData[monthIndex].count++;
    }
  });

  return monthlyData.map(({ month, count }) => ({ month, count }));
}

/**
 * Calculate score distribution from screenings
 * @param {Array} screenings - Array of screening documents
 * @returns {Object} Score distribution ranges
 */
function calculateScoreDistribution(screenings) {
  const distribution = {
    excellent: 0, // 80-100
    good: 0, // 60-79
    average: 0, // 40-59
    poor: 0, // 0-39
  };

  screenings.forEach((screening) => {
    if (screening.results && Array.isArray(screening.results)) {
      screening.results.forEach((result) => {
        const score = result.matchScore || 0;
        if (score >= 80) distribution.excellent++;
        else if (score >= 60) distribution.good++;
        else if (score >= 40) distribution.average++;
        else distribution.poor++;
      });
    }
  });

  return distribution;
}

// ==================== CONTROLLER METHODS ====================

/**
 * GET /analytics - Render analytics dashboard page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    console.log("📊 Loading Analytics Dashboard...");

    // Fetch summary statistics for dashboard cards
    const [totalResumes, totalScreenings, processedResumes, avgScore] =
      await Promise.all([
        Resume.countDocuments({}),
        Screening.countDocuments({}),
        Resume.countDocuments({ isProcessed: true }),
        Screening.aggregate([
          { $match: { "statistics.averageScore": { $exists: true } } },
          {
            $group: {
              _id: null,
              avgScore: { $avg: "$statistics.averageScore" },
            },
          },
        ]),
      ]);

    const summaryStats = {
      totalResumes,
      totalScreenings,
      processedResumes,
      averageScore: avgScore.length > 0 ? Math.round(avgScore[0].avgScore) : 0,
    };

    console.log("✅ Analytics summary stats:", summaryStats);

    res.render("pages/analytics", {
      title: "Analytics Dashboard",
      summaryStats,
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("❌ Error loading analytics dashboard:", error);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Unable to load analytics dashboard",
      currentYear: new Date().getFullYear(),
    });
  }
};

/**
 * GET /api/analytics/data - Get all analytics data for charts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAnalyticsData = async (req, res) => {
  try {
    console.log("📊 Fetching analytics data...");

    const startDate = getStartDate(ANALYTICS_CONFIG.MONTHS_TO_ANALYZE);

    // Fetch all necessary data in parallel for performance
    const [resumes, screenings, recentResumes] = await Promise.all([
      Resume.find({})
        .select("skills experience education createdAt uploadDate")
        .lean(),
      Screening.find({})
        .select("results statistics createdAt")
        .lean(),
      Resume.find({ createdAt: { $gte: startDate } })
        .select("createdAt uploadDate")
        .lean(),
    ]);

    console.log(`✅ Fetched ${resumes.length} resumes, ${screenings.length} screenings`);

    // Calculate all analytics
    const skillsDistribution = aggregateSkills(resumes);
    const experienceBreakdown = calculateExperienceDistribution(resumes);
    const educationStats = calculateEducationDistribution(resumes);
    const monthlyUploads = calculateMonthlyTrends(
      recentResumes,
      ANALYTICS_CONFIG.MONTHS_TO_ANALYZE
    );
    const scoreDistribution = calculateScoreDistribution(screenings);

    const analyticsData = {
      skillsDistribution,
      experienceBreakdown,
      educationStats,
      monthlyUploads,
      scoreDistribution,
      metadata: {
        totalResumes: resumes.length,
        totalScreenings: screenings.length,
        lastUpdated: new Date().toISOString(),
      },
    };

    console.log("✅ Analytics data calculated successfully");

    res.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("❌ Error fetching analytics data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics data",
      message: error.message,
    });
  }
};

/**
 * GET /api/analytics/skills - Get top skills data only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSkillsData = async (req, res) => {
  try {
    const resumes = await Resume.find({}).select("skills").lean();
    const skillsDistribution = aggregateSkills(resumes);

    res.json({
      success: true,
      data: skillsDistribution,
    });
  } catch (error) {
    console.error("❌ Error fetching skills data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch skills data",
    });
  }
};

/**
 * GET /api/analytics/trends - Get monthly trends data only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTrendsData = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || ANALYTICS_CONFIG.MONTHS_TO_ANALYZE;
    const startDate = getStartDate(months);

    const resumes = await Resume.find({ createdAt: { $gte: startDate } })
      .select("createdAt uploadDate")
      .lean();

    const monthlyUploads = calculateMonthlyTrends(resumes, months);

    res.json({
      success: true,
      data: monthlyUploads,
    });
  } catch (error) {
    console.error("❌ Error fetching trends data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch trends data",
    });
  }
};

// ==================== MODULE EXPORTS ====================

module.exports = {
  getAnalyticsDashboard: exports.getAnalyticsDashboard,
  getAnalyticsData: exports.getAnalyticsData,
  getSkillsData: exports.getSkillsData,
  getTrendsData: exports.getTrendsData,
};
