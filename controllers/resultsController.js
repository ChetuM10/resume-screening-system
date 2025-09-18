/**
 * @fileoverview Results Controller - SIMPLIFIED VERSION
 * @author Resume Screening System
 * @version 3.0.0
 */

const Screening = require('../models/Screening');
const Resume = require('../models/Resume');

const getScreeningResults = async (req, res) => {
  try {
    const sc = await Screening.findById(req.params.id)
      .populate('results.resumeId')
      .lean();

    if (!sc) {
      return res.status(404).render('pages/error', {
        title: 'Not found',
        message: 'Screening does not exist',
        currentYear: new Date().getFullYear()
      });
    }

    if (sc.results && sc.results.length > 0) {
      sc.results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.render('pages/results', {
      title: `Results - ${sc.jobTitle}`,
      jobTitle: sc.jobTitle,
      totalCandidates: sc.statistics?.totalCandidates || 0,
      qualifiedCandidates: sc.statistics?.qualifiedCandidates || 0,
      averageScore: Math.round(sc.statistics?.averageScore || 0),
      results: sc.results || [],
      screeningId: sc._id,
      createdAt: sc.createdAt,
      currentYear: new Date().getFullYear()
    });
  } catch (err) {
    console.error('Error loading screening results:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Server error loading results',
      currentYear: new Date().getFullYear()
    });
  }
};

// ✅ SIMPLIFIED: Basic candidate detail without complex calculations
const getCandidateDetail = async (req, res) => {
  try {
    const candidateId = req.params.id;
    console.log(`🔍 Loading candidate details for ID: ${candidateId}`);

    // Validate ObjectId format
    if (!candidateId || !candidateId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Invalid candidate ID format');
      return res.status(400).render('pages/error', {
        title: 'Invalid ID',
        message: 'Invalid candidate ID format',
        currentYear: new Date().getFullYear()
      });
    }

    // Fetch candidate data from Resume model
    const resume = await Resume.findById(candidateId).lean();

    if (!resume) {
      console.log('❌ Candidate not found in database');
      return res.status(404).render('pages/error', {
        title: 'Not found',
        message: 'Candidate not found',
        currentYear: new Date().getFullYear()
      });
    }

    console.log(`✅ Found candidate: ${resume.candidateName}`);
    console.log(`✅ Rendering simplified candidateDetail`);

    // ✅ SIMPLIFIED: Just pass basic resume data, no complex calculations
    res.render('pages/candidateDetail', {
      title: `${resume.candidateName || 'Unknown Candidate'} - Profile`,
      resume: resume,
      currentYear: new Date().getFullYear()
    });

  } catch (err) {
    console.error('❌ Error loading candidate details:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Server error loading candidate profile',
      currentYear: new Date().getFullYear()
    });
  }
};

const getResultsJson = async (req, res, next) => {
  try {
    const sc = await Screening.findById(req.params.id)
      .populate('results.resumeId')
      .lean();

    if (!sc) {
      return res.status(404).json({
        success: false,
        error: 'Screening not found'
      });
    }

    if (sc.results && sc.results.length > 0) {
      sc.results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.json({
      success: true,
      data: sc
    });
  } catch (err) {
    console.error('Error fetching screening JSON:', err);
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
        error: 'Resume not found'
      });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.originalName || 'resume.txt'}"`);
    res.send(resume.extractedText || 'Resume content not available');

  } catch (err) {
    console.error('Error downloading resume:', err);
    res.status(500).json({
      success: false,
      error: 'Error downloading resume'
    });
  }
};

module.exports = {
  getScreeningResults,
  getCandidateDetail,
  getResultsJson,
  downloadResume
};
