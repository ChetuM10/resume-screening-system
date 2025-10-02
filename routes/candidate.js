/**
 * @fileoverview Candidate Routes - SIMPLIFIED VERSION
 * @author Resume Screening System
 * @version 2.0.0
 */

const express = require("express");
const Resume = require("../models/Resume");
const Screening = require("../models/Screening");
const resultsController = require("../controllers/resultsController");

const router = express.Router();

// ==================== UTILITY FUNCTIONS ====================

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function logCandidateOperation(operation, candidateId, candidateName = "") {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] Candidate ${operation}: ${candidateId} ${
      candidateName ? `(${candidateName})` : ""
    }`
  );
}

// ==================== CANDIDATE DETAIL ROUTE ====================

/**
 * GET route - Display candidate profile details
 * Accessible at: /candidate/:id
 */
router.get("/:id", resultsController.getCandidateDetail);

// ✅ REMOVED: Download route completely removed

/**
 * GET route - Candidate API data (JSON)
 * Accessible at: /candidate/:id/json
 */
router.get("/:id/json", async (req, res) => {
  try {
    const candidateId = req.params.id;
    if (!isValidObjectId(candidateId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid candidate ID format",
      });
    }

    const candidate = await Resume.findById(candidateId).lean();
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: "Candidate not found",
      });
    }

    // Find screening results for this candidate
    const screeningResults = await Screening.find({
      "results.resumeId": candidateId,
    })
      .select("jobTitle createdAt results.$")
      .limit(5)
      .lean();

    logCandidateOperation("api_request", candidateId, candidate.candidateName);

    res.json({
      success: true,
      data: {
        candidate: candidate,
        screeningHistory: screeningResults,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching candidate API data:", error);
    res.status(500).json({
      success: false,
      error: "Server error fetching candidate data",
    });
  }
});

/**
 * POST route - Update candidate notes/status
 * Accessible at: /candidate/:id/update
 */
router.post("/:id/update", async (req, res) => {
  try {
    const candidateId = req.params.id;
    const { notes, status } = req.body;

    if (!isValidObjectId(candidateId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid candidate ID format",
      });
    }

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const candidate = await Resume.findByIdAndUpdate(candidateId, updateData, {
      new: true,
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: "Candidate not found",
      });
    }

    logCandidateOperation("update", candidateId, candidate.candidateName);

    res.json({
      success: true,
      message: "Candidate updated successfully",
      data: candidate,
    });
  } catch (error) {
    console.error("❌ Error updating candidate:", error);
    res.status(500).json({
      success: false,
      error: "Server error updating candidate",
    });
  }
});

// ==================== HEALTH CHECK ROUTE ====================

/**
 * GET route - Health check for candidate service
 * Accessible at: /candidate/health/check
 */
router.get("/health/check", async (req, res) => {
  try {
    const candidateCount = await Resume.countDocuments({});
    const processedCount = await Resume.countDocuments({ isProcessed: true });

    res.json({
      status: "healthy",
      service: "candidate-routes",
      totalCandidates: candidateCount,
      processedCandidates: processedCount,
      timestamp: new Date().toISOString(),
      version: "2.0.0",
    });
  } catch (error) {
    console.error("❌ Candidate service health check failed:", error);
    res.status(500).json({
      status: "error",
      service: "candidate-routes",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
