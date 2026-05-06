const Screening = require("../models/Screening");
const Resume = require("../models/Resume");
const ExcelJS = require("exceljs");
const CONSTANTS = require("../config/constants");

const getScreeningResults = async (req, res) => {
  try {
    const screeningId = req.params.id;

    const searchQuery = (req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const sc = await Screening.findById(screeningId)
      .populate("results.resumeId")
      .lean();

    if (!sc) {
      return res.status(404).render("pages/error", {
        title: "Not found",
        message: "Screening does not exist",
        currentYear: new Date().getFullYear(),
      });
    }

    let allResults = sc.results || [];

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      allResults = allResults.filter((result) => {
        const resume = result.resumeId;
        if (!resume) return false;
        const candidateName = (resume.candidateName || "").toLowerCase();
        const email = (resume.email || "").toLowerCase();
        return candidateName.includes(searchLower) || email.includes(searchLower);
      });
    }

    allResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    const totalCount = allResults.length;
    const paginatedResults = allResults.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const templateData = {
      title: `Results - ${sc.jobTitle || "Unknown Position"}`,
      jobTitle: sc.jobTitle || "Unknown Position",
      totalCandidates: sc.statistics?.totalCandidates || 0,
      qualifiedCandidates: sc.statistics?.qualifiedCandidates || 0,
      averageScore: Math.round(sc.statistics?.averageScore || 0),
      results: paginatedResults,
      screeningId: sc._id,
      createdAt: sc.createdAt,
      currentYear: new Date().getFullYear(),
      screening: {
        ...sc,
        createdAtFormatted: new Date(sc.createdAt).toLocaleDateString(),
      },
      statistics: sc.statistics || {},
      hasResults: paginatedResults.length > 0,
      searchQuery,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
        startIndex: totalCount > 0 ? skip + 1 : 0,
        endIndex: Math.min(skip + limit, totalCount),
      },
      query: req.query,
    };

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

    if (!candidateId || !candidateId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render("pages/error", {
        title: "Invalid ID",
        message: "Invalid candidate ID format",
        currentYear: new Date().getFullYear(),
      });
    }

    const resume = await Resume.findById(candidateId).lean();
    if (!resume) {
      return res.status(404).render("pages/error", {
        title: "Not found",
        message: "Candidate not found",
        currentYear: new Date().getFullYear(),
      });
    }

    res.render("pages/candidateDetail", {
      title: `${resume.candidateName || "Unknown Candidate"} - Profile`,
      resume: resume,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("Error loading candidate details:", err);
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
      return res.status(404).json({ success: false, error: "Screening not found" });
    }

    if (sc.results && sc.results.length > 0) {
      sc.results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.json({ success: true, data: sc });
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
      return res.status(404).json({ success: false, error: "Resume not found" });
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resume.originalName || "resume.txt"}"`
    );
    res.send(resume.extractedText || "Resume content not available");
  } catch (err) {
    console.error("Error downloading resume:", err);
    res.status(500).json({ success: false, error: "Error downloading resume" });
  }
};

const exportScreeningToExcel = async (req, res) => {
  try {
    const screeningId = req.params.id;

    const screening = await Screening.findById(screeningId)
      .populate("results.resumeId")
      .lean();

    if (!screening) {
      return res.status(404).json({ success: false, error: "Screening not found" });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Resume Screening System";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("Screening Results");

    worksheet.mergeCells("A1:I1");
    worksheet.getCell("A1").value = `Screening Results: ${screening.jobTitle || "Unknown Position"}`;
    worksheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "667EEA" } };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:I2");
    worksheet.getCell("A2").value = `Date: ${new Date(screening.createdAt).toLocaleDateString()} | Total Candidates: ${screening.results?.length || 0}`;
    worksheet.getCell("A2").font = { italic: true, size: 11 };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      "Rank", "Candidate Name", "Email", "Phone",
      "Match Score (%)", "Matched Skills", "Experience", "Education", "Status",
    ]);

    headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "667EEA" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;

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

    const sortedResults = (screening.results || []).sort(
      (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
    );

    sortedResults.forEach((result, index) => {
      const resume = result.resumeId;
      const matchScore = result.matchScore || 0;
      const isQualified = matchScore >= CONSTANTS.QUALIFICATION_THRESHOLD;

      const row = worksheet.addRow({
        rank: index + 1,
        name: resume?.candidateName || "Unknown",
        email: resume?.email || "N/A",
        phone: resume?.phone || "N/A",
        score: `${Math.round(matchScore)}%`,
        skills: result.matchedSkills?.join(", ") || "None",
        experience: resume?.experience?.years ? `${resume.experience.years} years` : "N/A",
        education: resume?.education?.degree || "N/A",
        status: isQualified ? "Qualified" : "Not Qualified",
      });

      if (index % 2 === 0) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F3F4F6" } };
      }

      const statusCell = row.getCell(9);
      if (isQualified) {
        statusCell.font = { color: { argb: "10B981" }, bold: true };
      } else {
        statusCell.font = { color: { argb: "EF4444" } };
      }

      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 3) {
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

    const filename = `Screening_${screening.jobTitle?.replace(/\s+/g, "_") || "Results"}_${Date.now()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting to Excel:", err);
    res.status(500).json({ success: false, error: "Error exporting to Excel: " + err.message });
  }
};

const searchCandidatesAPI = async (req, res) => {
  try {
    const screeningId = req.params.id;
    const searchQuery = (req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

    const screening = await Screening.findById(screeningId)
      .populate("results.resumeId")
      .lean();

    if (!screening) {
      return res.status(404).json({ success: false, error: "Screening not found" });
    }

    let allResults = screening.results || [];

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      allResults = allResults.filter((result) => {
        const resume = result.resumeId;
        if (!resume) return false;
        const candidateName = (resume.candidateName || "").toLowerCase();
        const email = (resume.email || "").toLowerCase();
        return candidateName.includes(searchLower) || email.includes(searchLower);
      });
    }

    allResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    const totalCount = allResults.length;
    const paginatedResults = allResults.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error("API search error:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};

module.exports = {
  getScreeningResults,
  getCandidateDetail,
  getResultsJson,
  downloadResume,
  exportScreeningToExcel,
  searchCandidatesAPI,
};
