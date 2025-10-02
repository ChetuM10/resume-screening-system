/**
 * @fileoverview COMPLETELY FIXED Screening Routes with Excel Export
 * @version 2.4.0 - Added Multi-JD Excel Export Route
 */

const express = require("express");
const router = express.Router();
const screeningController = require("../controllers/screeningController");
const Screening = require("../models/Screening");
const Resume = require("../models/Resume");

// ==================== UTILITY FUNCTIONS ====================
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function logScreeningOperation(operation, details = "") {
  console.log(
    `[${new Date().toISOString()}] Screening ${operation}: ${details}`
  );
}

// ==================== GET ROUTES ====================

/**
 * GET route - Enhanced Screening dashboard
 */
router.get("/", async (req, res) => {
  try {
    logScreeningOperation("dashboard load");

    const [
      recentScreenings,
      totalResumeCount,
      processedResumeCount,
      totalScreeningsCount,
      screeningStats,
    ] = await Promise.all([
      Screening.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("jobTitle screeningType statistics createdAt jobCategory")
        .lean(),
      Resume.countDocuments({}),
      Resume.countDocuments({ isProcessed: true }),
      Screening.countDocuments({}),
      Screening.aggregate([
        {
          $group: {
            _id: null,
            avgScore: { $avg: "$statistics.averageScore" },
            totalCandidatesScreened: { $sum: "$statistics.totalCandidates" },
          },
        },
      ]),
    ]);

    const processingRate =
      totalResumeCount > 0
        ? Math.round((processedResumeCount / totalResumeCount) * 100)
        : 0;

    const enhancedStats = screeningStats[0] || {
      avgScore: 0,
      totalCandidatesScreened: 0,
    };

    const enhancedRecentScreenings = recentScreenings.map((screening) => ({
      ...screening,
      candidateCount: screening.statistics?.totalCandidates || 0,
      qualificationRate:
        screening.statistics?.qualifiedCandidates &&
        screening.statistics?.totalCandidates
          ? Math.round(
              (screening.statistics.qualifiedCandidates /
                screening.statistics.totalCandidates) *
                100
            )
          : 0,
      typeLabel: screening.screeningType || "Basic",
    }));

    res.render("pages/screening", {
      title: "Enhanced Candidate Screening",
      recentScreenings: enhancedRecentScreenings,
      resumeCount: totalResumeCount,
      processedCount: processedResumeCount,
      processingRate,
      totalScreeningsCount,
      averageScore: Math.round(enhancedStats.avgScore || 0),
      totalCandidatesScreened: enhancedStats.totalCandidatesScreened || 0,
      currentYear: new Date().getFullYear(),
      features: {
        multiJD: true,
        domainIntelligence: true,
        predefinedJobs: true,
      },
    });
  } catch (error) {
    console.error("❌ Error loading screening dashboard:", error);
    res.render("pages/screening", {
      title: "Candidate Screening",
      recentScreenings: [],
      resumeCount: 0,
      processedCount: 0,
      processingRate: 0,
      totalScreeningsCount: 0,
      averageScore: 0,
      totalCandidatesScreened: 0,
      error: "Failed to load screening data.",
      currentYear: new Date().getFullYear(),
      features: {
        multiJD: false,
        domainIntelligence: false,
        predefinedJobs: false,
      },
    });
  }
});

// ==================== POST ROUTES ====================

router.post("/", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("📥 ROUTE: Received single JD screening request");

    if (!screeningController.submitJobRequirement) {
      return res.status(500).json({
        success: false,
        error: "Controller function not available",
        code: "CONTROLLER_MISSING",
      });
    }

    logScreeningOperation(
      "single-jd-start",
      `Job: ${req.body.jobTitle || "Unknown"}`
    );
    await screeningController.submitJobRequirement(req, res);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ ROUTE: Single screening route error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Single JD screening failed. Please try again.",
        code: "SCREENING_ROUTE_ERROR",
        processingTimeMs: processingTime,
      });
    }
  }
});

router.post("/multi", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("📥 ROUTE: Received MULTI-JD screening request");

    if (!screeningController.submitMultipleJobRequirements) {
      return res.status(500).json({
        success: false,
        error: "Multi-JD controller function not available",
        code: "MULTI_JD_CONTROLLER_MISSING",
      });
    }

    logScreeningOperation(
      "multi-jd-start",
      `Jobs: ${
        req.body.usePredefined
          ? "Predefined"
          : req.body.jobDescriptions?.length || 0
      }`
    );

    console.log(
      "🔄 ROUTE: Calling submitMultipleJobRequirements controller..."
    );
    await screeningController.submitMultipleJobRequirements(req, res);
    console.log("✅ ROUTE: Controller call completed successfully");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ ROUTE: Multi-JD screening route error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Multi-JD screening failed: ${error.message}`,
        code: "MULTI_JD_ROUTE_ERROR",
        processingTimeMs: processingTime,
      });
    }
  }
});

// ==================== RESULTS ROUTES ====================

router.get("/results/:id", async (req, res) => {
  try {
    const { id } = req.params;
    logScreeningOperation("view-results", `ID: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).render("pages/error", {
        title: "Invalid Request",
        message: "Invalid screening ID format",
        backUrl: "/screening",
      });
    }

    const screening = await Screening.findById(id)
      .populate("results.resumeId")
      .lean();

    if (!screening) {
      return res.status(404).render("pages/error", {
        title: "Not Found",
        message: "Screening results not found",
        backUrl: "/screening",
      });
    }

    // Sort results by match score
    if (screening.results && screening.results.length > 0) {
      screening.results.sort(
        (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
      );
    }

    const enhancedResults =
      screening.results?.map((candidate, index) => ({
        ...candidate,
        displayRank: index + 1,
        scoreClass:
          candidate.matchScore >= 80
            ? "score-excellent"
            : candidate.matchScore >= 60
            ? "score-good"
            : candidate.matchScore >= 40
            ? "score-average"
            : "score-poor",
      })) || [];

    console.log(
      `✅ Loaded ${enhancedResults.length} results for screening: ${screening.jobTitle}`
    );

    res.render("pages/results", {
      title: `Results - ${screening.jobTitle}`,
      jobTitle: screening.jobTitle || "Unknown Position",
      totalCandidates: screening.statistics?.totalCandidates || 0,
      qualifiedCandidates: screening.statistics?.qualifiedCandidates || 0,
      averageScore: Math.round(screening.statistics?.averageScore || 0),
      results: enhancedResults,
      screeningId: screening._id,
      createdAt: screening.createdAt,
      currentYear: new Date().getFullYear(),
      screening: {
        ...screening,
        createdAtFormatted: new Date(screening.createdAt).toLocaleDateString(),
      },
      statistics: screening.statistics,
      hasResults: enhancedResults.length > 0,
    });
  } catch (error) {
    console.error("❌ Error loading single JD results:", error);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Failed to load screening results",
      backUrl: "/screening",
    });
  }
});

/**
 * ✅ CRITICAL FIX: Multi-JD results route with enhanced score handling
 */
router.get("/multi-results/:id", async (req, res) => {
  try {
    const { id } = req.params;
    logScreeningOperation("view-multi-results", `ID: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).render("pages/error", {
        title: "Invalid Request",
        message: "Invalid multi-JD screening ID format",
        backUrl: "/screening",
      });
    }

    const screening = await Screening.findById(id).lean();
    if (!screening) {
      return res.status(404).render("pages/error", {
        title: "Not Found",
        message: "Multi-JD screening not found",
        backUrl: "/screening",
      });
    }

    if (screening.screeningType !== "multi-jd") {
      return res.status(400).render("pages/error", {
        title: "Invalid Screening Type",
        message: "This screening is not a multi-JD screening",
        backUrl: "/screening",
      });
    }

    // ✅ CRITICAL FIX: Enhanced result processing with proper score extraction
    const enhancedResults =
      screening.results?.map((candidate, index) => {
        console.log(`Processing candidate ${candidate.candidateName}:`, {
          bestJobMatch: candidate.bestJobMatch,
          hasScore: candidate.bestJobMatch?.score !== undefined,
        });

        return {
          ...candidate,
          displayRank: index + 1,
          bestJobScore:
            candidate.bestJobMatch?.score ||
            candidate.bestJobScore ||
            candidate.score ||
            0,
          bestJobTitle: candidate.bestJobMatch?.jobTitle || "Unknown",
          bestJobCategory: candidate.bestJobMatch?.category || "unknown",
        };
      }) || [];

    console.log(
      `✅ Loaded ${enhancedResults.length} multi-JD results for screening`
    );
    console.log(
      "Score samples:",
      enhancedResults.slice(0, 3).map((r) => ({
        name: r.candidateName,
        score: r.bestJobScore,
      }))
    );

    res.render("pages/multiResults", {
      title: "Multi-JD Screening Results",
      screening: {
        ...screening,
        createdAtFormatted: new Date(screening.createdAt).toLocaleDateString(),
      },
      screeningId: screening._id, // ✅ CRITICAL: Pass screeningId for Excel export
      results: enhancedResults,
      statistics: screening.statistics,
      jobCategories: screening.jobCategories || [],
      totalCandidates: screening.totalCandidates,
      hasResults: enhancedResults.length > 0,
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("❌ Error loading multi-JD results:", error);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Failed to load multi-JD results",
      backUrl: "/screening",
    });
  }
});

/**
 * ✅ NEW: Multi-JD Excel Export Route
 * @route GET /screening/multi-results/:id/export
 */
router.get("/multi-results/:id/export", async (req, res) => {
  try {
    const { id } = req.params;
    logScreeningOperation("export-multi-jd-excel", `ID: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid screening ID format",
      });
    }

    if (!screeningController.exportMultiJDToExcel) {
      return res.status(500).json({
        success: false,
        error: "Excel export function not available",
      });
    }

    console.log("📊 Calling exportMultiJDToExcel controller...");
    await screeningController.exportMultiJDToExcel(req, res);
    console.log("✅ Excel export completed successfully");
  } catch (error) {
    console.error("❌ Error in multi-JD Excel export route:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Excel export failed: ${error.message}`,
      });
    }
  }
});

/**
 * ✅ Individual candidate details route
 */
router.get("/candidate/:id", async (req, res) => {
  try {
    const { id } = req.params;
    logScreeningOperation("view-candidate", `ID: ${id}`);

    if (!isValidObjectId(id)) {
      return res.status(400).render("pages/error", {
        title: "Invalid Request",
        message: "Invalid candidate ID format",
        backUrl: "/screening",
      });
    }

    const candidate = await Resume.findById(id).lean();
    if (!candidate) {
      return res.status(404).render("pages/error", {
        title: "Not Found",
        message: "Candidate not found",
        backUrl: "/screening",
      });
    }

    const recentScreenings = await Screening.find({
      "results.resumeId": id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`✅ Loaded candidate details for: ${candidate.candidateName}`);

    res.render("pages/candidateDetail", {
      title: `${candidate.candidateName || "Candidate"} - Details`,
      candidate,
      recentScreenings,
      backUrl: req.get("Referer") || "/screening",
      currentYear: new Date().getFullYear(),
    });
  } catch (error) {
    console.error("❌ Error loading candidate details:", error);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Failed to load candidate details",
      backUrl: "/screening",
    });
  }
});

// ==================== DELETE ROUTE ====================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid screening ID format",
      });
    }

    const screening = await Screening.findById(id).select(
      "jobTitle statistics screeningType"
    );
    if (!screening) {
      return res.status(404).json({
        success: false,
        error: "Screening not found",
      });
    }

    await Screening.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Screening deleted successfully",
      data: {
        deletedId: id,
        jobTitle: screening.jobTitle,
        screeningType: screening.screeningType,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting screening:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete screening",
    });
  }
});

// ==================== API ROUTES ====================

router.get("/api/config", async (req, res) => {
  try {
    if (!screeningController.getScreeningConfig) {
      return res.status(500).json({
        success: false,
        error: "Configuration function not available",
      });
    }
    await screeningController.getScreeningConfig(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch screening configuration",
    });
  }
});

router.post("/api/validate", async (req, res) => {
  try {
    if (!screeningController.validateJobRequirements) {
      return res.status(500).json({
        success: false,
        error: "Validation function not available",
      });
    }
    await screeningController.validateJobRequirements(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to validate job requirements",
    });
  }
});

router.get("/api/predefined-jobs", async (req, res) => {
  try {
    if (!screeningController.getPredefinedJobs) {
      return res.status(500).json({
        success: false,
        error: "Predefined jobs function not available",
      });
    }
    await screeningController.getPredefinedJobs(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch predefined jobs",
    });
  }
});

module.exports = router;
