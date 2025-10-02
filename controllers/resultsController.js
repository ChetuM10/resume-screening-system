/**
 * @fileoverview Results Controller - WITH EXCEL EXPORT
 * @author Resume Screening System
 * @version 3.2.2 - Fixed Qualification Logic with Debug Logging
 */

const Screening = require("../models/Screening");
const Resume = require("../models/Resume");
const ExcelJS = require("exceljs");

// ==================== EXISTING FUNCTIONS ====================

const getScreeningResults = async (req, res) => {
  try {
    const sc = await Screening.findById(req.params.id)
      .populate("results.resumeId")
      .lean();

    if (!sc) {
      return res.status(404).render("pages/error", {
        title: "Not found",
        message: "Screening does not exist",
        currentYear: new Date().getFullYear(),
      });
    }

    // Sort results by match score
    if (sc.results && sc.results.length > 0) {
      sc.results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    // ✅ CRITICAL FIX: Ensure all template variables are defined
    const templateData = {
      title: `Results - ${sc.jobTitle || "Unknown Position"}`,
      jobTitle: sc.jobTitle || "Unknown Position",
      totalCandidates: sc.statistics?.totalCandidates || 0,
      qualifiedCandidates: sc.statistics?.qualifiedCandidates || 0,
      averageScore: Math.round(sc.statistics?.averageScore || 0),
      results: sc.results || [],
      screeningId: sc._id,
      createdAt: sc.createdAt,
      currentYear: new Date().getFullYear(),
      screening: {
        ...sc,
        createdAtFormatted: new Date(sc.createdAt).toLocaleDateString(),
      },
      statistics: sc.statistics || {},
      hasResults: sc.results && sc.results.length > 0,
    };

    console.log("✅ Template data being passed:", {
      jobTitle: templateData.jobTitle,
      totalCandidates: templateData.totalCandidates,
      resultsCount: templateData.results.length,
    });

    res.render("pages/results", templateData);
  } catch (err) {
    console.error("Error loading screening results:", err);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Server error loading results",
      currentYear: new Date().getFullYear(),
    });
  }
};

const getCandidateDetail = async (req, res) => {
  try {
    const candidateId = req.params.id;
    console.log(`🔍 Loading candidate details for ID: ${candidateId}`);

    // Validate ObjectId format
    if (!candidateId || !candidateId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("❌ Invalid candidate ID format");
      return res.status(400).render("pages/error", {
        title: "Invalid ID",
        message: "Invalid candidate ID format",
        currentYear: new Date().getFullYear(),
      });
    }

    // Fetch candidate data from Resume model
    const resume = await Resume.findById(candidateId).lean();
    if (!resume) {
      console.log("❌ Candidate not found in database");
      return res.status(404).render("pages/error", {
        title: "Not found",
        message: "Candidate not found",
        currentYear: new Date().getFullYear(),
      });
    }

    console.log(`✅ Found candidate: ${resume.candidateName}`);
    console.log(`✅ Rendering simplified candidateDetail`);

    res.render("pages/candidateDetail", {
      title: `${resume.candidateName || "Unknown Candidate"} - Profile`,
      resume: resume,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("❌ Error loading candidate details:", err);
    res.status(500).render("pages/error", {
      title: "Error",
      message: "Server error loading candidate profile",
      currentYear: new Date().getFullYear(),
    });
  }
};

const getResultsJson = async (req, res, next) => {
  try {
    const sc = await Screening.findById(req.params.id)
      .populate("results.resumeId")
      .lean();

    if (!sc) {
      return res.status(404).json({
        success: false,
        error: "Screening not found",
      });
    }

    if (sc.results && sc.results.length > 0) {
      sc.results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.json({
      success: true,
      data: sc,
    });
  } catch (err) {
    console.error("Error fetching screening JSON:", err);
    next(err);
  }
};

const downloadResume = async (req, res) => {
  try {
    const candidateId = req.params.id;
    const resume = await Resume.findById(candidateId).lean();

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: "Resume not found",
      });
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resume.originalName || "resume.txt"}"`
    );
    res.send(resume.extractedText || "Resume content not available");
  } catch (err) {
    console.error("Error downloading resume:", err);
    res.status(500).json({
      success: false,
      error: "Error downloading resume",
    });
  }
};

// ==================== ✅ EXCEL EXPORT FUNCTION WITH DEBUG ====================

/**
 * Export screening results to Excel file
 * @route GET /results/:id/export
 */
const exportScreeningToExcel = async (req, res) => {
  try {
    const screeningId = req.params.id;
    console.log(`\n📊 ========== EXCEL EXPORT STARTED ==========`);
    console.log(`📊 Screening ID: ${screeningId}`);

    // Fetch screening with populated resume data
    const screening = await Screening.findById(screeningId)
      .populate("results.resumeId")
      .lean();

    if (!screening) {
      console.log("❌ Screening not found");
      return res.status(404).json({
        success: false,
        error: "Screening not found",
      });
    }

    console.log(`✅ Screening found: ${screening.jobTitle}`);
    console.log(`✅ Total results: ${screening.results?.length || 0}`);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Resume Screening System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add worksheet
    const worksheet = workbook.addWorksheet("Screening Results");

    // Add title rows
    worksheet.mergeCells("A1:I1");
    worksheet.getCell("A1").value = `Screening Results: ${
      screening.jobTitle || "Unknown Position"
    }`;
    worksheet.getCell("A1").font = {
      bold: true,
      size: 16,
      color: { argb: "667EEA" },
    };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.mergeCells("A2:I2");
    worksheet.getCell("A2").value = `Date: ${new Date(
      screening.createdAt
    ).toLocaleDateString()} | Total Candidates: ${
      screening.results?.length || 0
    }`;
    worksheet.getCell("A2").font = { italic: true, size: 11 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Add empty row
    worksheet.addRow([]);

    // Define column headers
    const headerRow = worksheet.addRow([
      "Rank",
      "Candidate Name",
      "Email",
      "Phone",
      "Match Score (%)",
      "Matched Skills",
      "Experience",
      "Education",
      "Status",
    ]);

    // Style header row
    headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "667EEA" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;

    // Set column widths
    worksheet.columns = [
      { key: "rank", width: 8 },
      { key: "name", width: 25 },
      { key: "email", width: 30 },
      { key: "phone", width: 15 },
      { key: "score", width: 15 },
      { key: "skills", width: 40 },
      { key: "experience", width: 18 },
      { key: "education", width: 25 },
      { key: "status", width: 12 },
    ];

    // Sort results by match score
    const sortedResults = (screening.results || []).sort(
      (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
    );

    console.log(`\n📋 ========== CANDIDATE QUALIFICATION STATUS ==========`);

    // Add data rows
    sortedResults.forEach((result, index) => {
      const resume = result.resumeId;
      const matchScore = result.matchScore || 0;

      // ✅ FIXED: Determine qualification based on score (70% threshold)
      const isQualified = matchScore >= 70;

      // ✅ DEBUG: Log each candidate's qualification status
      const statusIcon = isQualified ? "✅" : "❌";
      console.log(
        `${statusIcon} ${index + 1}. ${
          resume?.candidateName || "Unknown"
        } - Score: ${Math.round(matchScore)}% - Status: ${
          isQualified ? "QUALIFIED" : "NOT QUALIFIED"
        }`
      );

      const row = worksheet.addRow({
        rank: index + 1,
        name: resume?.candidateName || "Unknown",
        email: resume?.email || "N/A",
        phone: resume?.phone || "N/A",
        score: `${Math.round(matchScore)}%`,
        skills: result.matchedSkills?.join(", ") || "None",
        experience: resume?.experience?.years
          ? `${resume.experience.years} years`
          : "N/A",
        education: resume?.education?.degree || "N/A",
        status: isQualified ? "Qualified" : "Not Qualified",
      });

      // Alternate row coloring
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F3F4F6" },
        };
      }

      // ✅ FIXED: Color code status based on score
      const statusCell = row.getCell(9);
      if (isQualified) {
        statusCell.font = { color: { argb: "10B981" }, bold: true };
      } else {
        statusCell.font = { color: { argb: "EF4444" } };
      }

      // Center align certain columns
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
    });

    console.log(`\n========== END QUALIFICATION STATUS ==========\n`);

    // Add borders to all cells
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 3) {
        // Skip title rows
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "D1D5DB" } },
            left: { style: "thin", color: { argb: "D1D5DB" } },
            bottom: { style: "thin", color: { argb: "D1D5DB" } },
            right: { style: "thin", color: { argb: "D1D5DB" } },
          };
        });
      }
    });

    // Set response headers for file download
    const filename = `Screening_${
      screening.jobTitle?.replace(/\s+/g, "_") || "Results"
    }_${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ Excel file exported successfully: ${filename}`);
    console.log(`========== EXCEL EXPORT COMPLETED ==========\n`);
  } catch (err) {
    console.error("❌ Error exporting to Excel:", err);
    res.status(500).json({
      success: false,
      error: "Error exporting to Excel: " + err.message,
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  getScreeningResults,
  getCandidateDetail,
  getResultsJson,
  downloadResume,
  exportScreeningToExcel,
};
