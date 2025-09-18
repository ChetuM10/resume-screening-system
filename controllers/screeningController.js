/**
 * @fileoverview COMPLETELY FIXED Multi-JD Screening Controller
 * Handles single and multiple job description screening with domain intelligence
 * @author Resume Screening System
 * @version 2.5.0 - CRITICAL FIX for Statistics and Score Display Issues
 */

const Resume = require('../models/Resume');
const Screening = require('../models/Screening');
const matching = require('../services/matchingEngine');

// ==================== UTILITY IMPORTS ====================
let pick;
try {
  pick = require('../utils/objectUtils').pick;
} catch (error) {
  console.log('ObjectUtils not found - using fallback implementation');
  pick = (obj, keys) => keys.reduce((acc, key) => {
    if (obj && obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

// ==================== ENHANCED CONFIGURATION ====================
const DEFAULT_SCREENING_CONFIG = {
  REQUIRED_SKILLS: ['JavaScript', 'HTML'],
  EXPERIENCE_MIN: 0,
  EXPERIENCE_MAX: 5,
  QUALIFYING_SCORE: 50,
  MAX_RESULTS: 100
};

const SCREENING_TYPES = {
  BASIC: 'basic',
  ADVANCED: 'advanced',
  MULTI_JD: 'multi-jd',
  ML_ENHANCED: 'ml-enhanced'
};

// ==================== JOB DESCRIPTIONS LIBRARY ====================
const PREDEFINED_JOBS = {
  'network_engineer': {
    jobTitle: 'Network Engineer',
    jobDescription: 'Network Engineer position requiring expertise in network infrastructure, routing protocols, and monitoring tools.',
    requiredSkills: ['TCP/IP', 'OSPF', 'HSRP', 'VLAN', 'DHCP', 'Cisco Meraki', 'ThousandEyes', 'Network Monitoring'],
    minExp: 0,
    maxExp: 3,
    educationLevel: 'Computer Science, Information Technology, or related field',
    location: 'Bangalore'
  },
  'full_stack_developer': {
    jobTitle: 'Full Stack Developer',
    jobDescription: 'Full Stack Developer role focused on building scalable web applications using modern technologies.',
    requiredSkills: ['JavaScript', 'HTML5', 'CSS3', 'React', 'Node.js', 'Express.js', 'MongoDB', 'REST APIs'],
    minExp: 0,
    maxExp: 3,
    educationLevel: 'Computer Science, Engineering, or related field',
    location: 'Bangalore'
  },
  'software_developer': {
    jobTitle: 'Software Development Intern',
    jobDescription: 'Software Development Internship offering hands-on experience in application development.',
    requiredSkills: ['Programming', 'JavaScript', 'Python', 'Java', 'Git', 'Databases', 'Problem Solving'],
    minExp: 0,
    maxExp: 1,
    educationLevel: 'Computer Science, Software Engineering, or related field',
    location: 'Bangalore'
  },
  'finance_intern': {
    jobTitle: 'Finance Intern',
    jobDescription: 'Finance Internship providing experience in financial analysis and accounting processes.',
    requiredSkills: ['Financial Analysis', 'Accounting', 'Tally ERP9', 'Excel', 'Power BI', 'Financial Reporting'],
    minExp: 0,
    maxExp: 1,
    educationLevel: 'Finance, Accounting, Commerce, or MBA',
    location: 'Bangalore'
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate job requirements data
 */
function validateJobRequirementsData(requirements) {
  const errors = [];
  
  if (!requirements.jobTitle || requirements.jobTitle.trim().length < 2) {
    errors.push('Job title must be at least 2 characters long');
  }
  
  if (requirements.requiredSkills && !Array.isArray(requirements.requiredSkills)) {
    if (typeof requirements.requiredSkills !== 'string') {
      errors.push('Required skills must be an array or comma-separated string');
    }
  }
  
  if (requirements.minExp !== undefined && (isNaN(requirements.minExp) || requirements.minExp < 0)) {
    errors.push('Minimum experience must be a valid non-negative number');
  }
  
  if (requirements.maxExp !== undefined && (isNaN(requirements.maxExp) || requirements.maxExp < 0)) {
    errors.push('Maximum experience must be a valid non-negative number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize job requirements data
 */
function normalizeJobRequirementsData(rawRequirements) {
  const {
    jobTitle = 'General Position',
    jobDescription = '',
    requiredSkills = DEFAULT_SCREENING_CONFIG.REQUIRED_SKILLS,
    minExp = DEFAULT_SCREENING_CONFIG.EXPERIENCE_MIN,
    maxExp = DEFAULT_SCREENING_CONFIG.EXPERIENCE_MAX,
    educationLevel = '',
    location = ''
  } = rawRequirements;

  let skillsArray = [];
  if (Array.isArray(requiredSkills)) {
    skillsArray = requiredSkills.filter(skill => skill && skill.trim());
  } else if (typeof requiredSkills === 'string') {
    skillsArray = requiredSkills
      .split(/[,;|\n]/)
      .map(skill => skill.trim())
      .filter(Boolean);
  } else {
    skillsArray = DEFAULT_SCREENING_CONFIG.REQUIRED_SKILLS;
  }

  return {
    jobTitle: jobTitle.trim(),
    jobDescription: jobDescription.trim(),
    requiredSkills: skillsArray,
    minExp: Number(minExp) || 0,
    maxExp: Number(maxExp) || 50,
    educationLevel: educationLevel.trim(),
    location: location.trim()
  };
}

/**
 * Score single candidate for single JD
 */
async function scoreSingleCandidateData(resume, jobRequirements) {
  try {
    console.log(`🎯 Scoring: ${resume.candidateName} for ${jobRequirements.jobTitle}`);
    
    const score = await matching.scoreCandidate(resume, {
      requiredSkills: jobRequirements.requiredSkills,
      minExp: jobRequirements.minExp,
      maxExp: jobRequirements.maxExp,
      educationLevel: jobRequirements.educationLevel,
      jobTitle: jobRequirements.jobTitle,
      jobDescription: jobRequirements.jobDescription
    });

    console.log(`✅ Score: ${resume.candidateName} - ${score.matchScore || 0}%`);

    return {
      ...resume.toObject(),
      ...score,
      processingError: false,
      jobCategory: score.jobCategory || 'general'
    };

  } catch (error) {
    console.error(`❌ Scoring error for ${resume.candidateName}:`, error.message);
    return {
      ...resume.toObject(),
      matchScore: 5,
      skillsMatch: {
        matched: [],
        missing: jobRequirements.requiredSkills,
        percentage: 0
      },
      experienceMatch: false,
      educationMatch: false,
      reasons: [`Scoring error: ${error.message}`],
      processingError: true,
      jobCategory: 'unknown'
    };
  }
}

/**
 * ✅ CRITICAL FIX: Score candidate against multiple job descriptions
 */
async function scoreMultipleJobsForCandidateData(resume, jobDescriptions) {
  try {
    console.log(`🎯 Multi-JD scoring: ${resume.candidateName} against ${jobDescriptions.length} jobs`);

    const results = {};
    
    // Score against each job description
    for (const job of jobDescriptions) {
      try {
        const score = await matching.scoreCandidate(resume, {
          requiredSkills: job.requiredSkills,
          minExp: job.minExp,
          maxExp: job.maxExp,
          educationLevel: job.educationLevel,
          jobTitle: job.jobTitle,
          jobDescription: job.jobDescription
        });

        results[job.jobTitle] = {
          ...score,
          jobCategory: score.jobCategory || 'general'
        };

      } catch (jobError) {
        console.error(`❌ Error scoring ${resume.candidateName} for ${job.jobTitle}:`, jobError.message);
        results[job.jobTitle] = {
          matchScore: 5,
          score: 5,
          skillsMatch: { matched: [], missing: job.requiredSkills || [], percentage: 0 },
          experienceMatch: false,
          educationMatch: false,
          reasons: [`Error: ${jobError.message}`],
          jobCategory: 'unknown'
        };
      }
    }

    // ✅ CRITICAL FIX: Find the best job match with proper score extraction
    let bestJob = { jobTitle: 'None', score: 0, category: 'unknown' };
    let maxScore = 0;
    
    Object.entries(results).forEach(([jobTitle, result]) => {
      const score = Number(result.matchScore || result.score || 0);
      console.log(`📊 ${resume.candidateName} - ${jobTitle}: ${score}%`);
      
      if (score > maxScore) {
        maxScore = score;
        bestJob = {
          jobTitle: jobTitle,
          score: score,  // ✅ CRITICAL: Ensure score is a number
          category: result.jobCategory || 'general'
        };
      }
    });

    console.log(`✅ Best match for ${resume.candidateName}: ${bestJob.jobTitle} (${bestJob.score}%)`);

    return {
      ...resume.toObject(),
      multiJobScores: results,
      bestJob,
      processingError: false
    };

  } catch (error) {
    console.error(`❌ Multi-JD scoring error for ${resume.candidateName}:`, error.message);
    
    // Create fallback results
    const fallbackResults = {};
    jobDescriptions.forEach(job => {
      fallbackResults[job.jobTitle] = {
        score: 5,
        matchScore: 5,
        skillsMatch: { matched: [], missing: job.requiredSkills || [], percentage: 0 },
        experienceMatch: false,
        educationMatch: false,
        reasons: [`Error: ${error.message}`],
        jobCategory: 'unknown'
      };
    });

    return {
      ...resume.toObject(),
      multiJobScores: fallbackResults,
      bestJob: { jobTitle: 'Error', score: 5, category: 'unknown' },
      processingError: true,
      errorDetails: error.message
    };
  }
}

/**
 * ✅ CRITICAL FIX: Calculate screening statistics with proper handling
 */
function calculateScreeningStatisticsData(screeningResults, isMultiJD = false) {
  const totalCount = screeningResults.length;
  
  if (totalCount === 0) {
    return {
      totalCandidates: 0,
      qualifiedCandidates: 0,
      averageScore: 0,
      averageBestScore: 0,
      topScore: 0
    };
  }

  if (isMultiJD) {
    const jobCategories = {};
    let totalBestScores = 0;
    let validScoreCount = 0;
    let topScore = 0;

    screeningResults.forEach(candidate => {
      // ✅ FIXED: More robust score extraction
      let candidateScore = 0;
      
      if (candidate.bestJob && typeof candidate.bestJob.score === 'number') {
        candidateScore = candidate.bestJob.score;
      } else if (candidate.bestJob && candidate.bestJob.score !== undefined) {
        candidateScore = Number(candidate.bestJob.score) || 0;
      } else if (candidate.score !== undefined) {
        candidateScore = Number(candidate.score) || 0;
      } else if (candidate.matchScore !== undefined) {
        candidateScore = Number(candidate.matchScore) || 0;
      }

      // Only count valid scores
      if (candidateScore > 0 && candidateScore <= 100) {
        const category = (candidate.bestJob?.category || 'general');
        if (!jobCategories[category]) {
          jobCategories[category] = { count: 0, totalScore: 0 };
        }
        
        jobCategories[category].count++;
        jobCategories[category].totalScore += candidateScore;
        totalBestScores += candidateScore;
        validScoreCount++;
        
        if (candidateScore > topScore) {
          topScore = candidateScore;
        }
      }
    });

    console.log(`📊 Multi-JD Statistics: ${validScoreCount}/${totalCount} valid scores, total: ${totalBestScores}`);

    return {
      totalCandidates: totalCount,
      averageBestScore: validScoreCount > 0 ? Math.round(totalBestScores / validScoreCount) : 0,
      averageScore: validScoreCount > 0 ? Math.round(totalBestScores / validScoreCount) : 0, // Fallback
      topScore: topScore,
      categoryBreakdown: Object.entries(jobCategories).map(([category, data]) => ({
        category,
        candidateCount: data.count,
        averageScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0
      })),
      qualifiedCandidates: screeningResults.filter(c => {
        const score = c.bestJob?.score || c.score || c.matchScore || 0;
        return Number(score) >= DEFAULT_SCREENING_CONFIG.QUALIFYING_SCORE;
      }).length
    };

  } else {
    const scores = screeningResults.map(c => Number(c.matchScore || c.score || 0));
    const validScores = scores.filter(s => s > 0 && s <= 100);
    const averageScore = validScores.length > 0 ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : 0;
    const qualifiedCandidates = validScores.filter(score => score >= DEFAULT_SCREENING_CONFIG.QUALIFYING_SCORE).length;
    const topScore = validScores.length > 0 ? Math.max(...validScores) : 0;

    return {
      totalCandidates: totalCount,
      qualifiedCandidates,
      averageScore,
      topScore,
      scoreDistribution: {
        excellent: validScores.filter(s => s >= 80).length,
        good: validScores.filter(s => s >= 60 && s < 80).length,
        average: validScores.filter(s => s >= 40 && s < 60).length,
        poor: validScores.filter(s => s < 40).length
      }
    };
  }
}

// ==================== MAIN CONTROLLER FUNCTIONS ====================

/**
 * ✅ FIXED: Enhanced single JD screening
 */
exports.submitJobRequirement = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📥 Starting single JD screening process');

    // Validate input
    const validation = validateJobRequirementsData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job requirements',
        details: validation.errors
      });
    }

    // Get job requirements (predefined or custom)
    const predefinedJob = req.body.jobType && PREDEFINED_JOBS[req.body.jobType];
    const jobRequirements = predefinedJob
      ? { ...predefinedJob, ...normalizeJobRequirementsData(req.body) }
      : normalizeJobRequirementsData(req.body);

    console.log('🔧 Screening criteria:', {
      jobTitle: jobRequirements.jobTitle,
      skills: jobRequirements.requiredSkills.slice(0, 5),
      totalSkills: jobRequirements.requiredSkills.length,
      experience: `${jobRequirements.minExp}-${jobRequirements.maxExp} years`
    });

    // Get processed resumes
    const resumes = await Resume.find({ isProcessed: true });
    console.log('📊 Found resumes:', resumes.length);

    if (resumes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processed resumes found',
        suggestion: 'Upload and process resumes first using the upload feature'
      });
    }

    // Score all candidates
    const scoredCandidates = await Promise.all(
      resumes.map(resume => scoreSingleCandidateData(resume, jobRequirements))
    );

    // Sort by match score
    scoredCandidates.sort((a, b) => {
      const scoreA = Number(a.matchScore || 0);
      const scoreB = Number(b.matchScore || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      const skillsA = a.skillsMatch?.matched?.length || 0;
      const skillsB = b.skillsMatch?.matched?.length || 0;
      return skillsB - skillsA;
    });

    // Add rankings
    const rankedResults = scoredCandidates.map((candidate, index) => ({
      ...candidate,
      overallRank: index + 1
    }));

    // Calculate statistics
    const statistics = calculateScreeningStatisticsData(rankedResults, false);
    console.log('📊 Single JD statistics:', statistics);

    // Prepare database results
    const databaseResults = rankedResults.map(candidate => ({
      resumeId: candidate._id,
      candidateName: candidate.candidateName || 'Unknown Candidate',
      matchScore: Number(candidate.matchScore || 0),
      overallRank: candidate.overallRank,
      skillsMatch: candidate.skillsMatch ? candidate.skillsMatch.percentage : 0,
      matchedSkills: candidate.skillsMatch?.matched || [],
      missingSkills: candidate.skillsMatch?.missing || [],
      experienceMatch: candidate.experienceMatch || false,
      educationMatch: candidate.educationMatch || false,
      reasons: candidate.reasons || [],
      experienceYears: candidate.experience?.years || 0,
      education: candidate.education?.degree || candidate.education || 'Not specified',
      email: candidate.email,
      phone: candidate.phone,
      skills: candidate.skills || [],
      jobCategory: candidate.jobCategory || 'general',
      processingError: candidate.processingError || false
    }));

    // Save screening to database
    const screening = new Screening({
      jobTitle: jobRequirements.jobTitle,
      jobDescription: jobRequirements.jobDescription,
      requiredSkills: jobRequirements.requiredSkills,
      experienceLevel: {
        min: jobRequirements.minExp,
        max: jobRequirements.maxExp
      },
      educationLevel: jobRequirements.educationLevel,
      location: jobRequirements.location,
      results: databaseResults,
      statistics,
      screeningType: predefinedJob ? SCREENING_TYPES.ADVANCED : SCREENING_TYPES.BASIC,
      minimumScore: DEFAULT_SCREENING_CONFIG.QUALIFYING_SCORE,
      processingStatus: 'completed',
      totalCandidates: statistics.totalCandidates,
      jobCategory: predefinedJob ? req.body.jobType : 'custom',
      createdBy: req.user?.name || 'System'
    });

    await screening.save();

    const processingTime = Date.now() - startTime;
    console.log(`✅ Single JD screening completed in ${processingTime}ms`);

    res.status(200).json({
      success: true,
      message: 'Candidate screening completed successfully',
      screeningId: screening._id,
      resultsUrl: `/screening/results/${screening._id}`,
      statistics: {
        ...statistics,
        processingTimeMs: processingTime,
        errorCount: rankedResults.filter(r => r.processingError).length
      },
      preview: {
        topCandidates: rankedResults.slice(0, 5).map(c => ({
          name: c.candidateName,
          score: c.matchScore,
          rank: c.overallRank,
          matchedSkills: c.skillsMatch?.matched?.slice(0, 3) || []
        }))
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Single JD screening failed:', error);
    
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development'
        ? `Screening Error: ${error.message}`
        : 'Internal server error during screening',
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * ✅ CRITICAL FIX: Multi-JD screening controller with proper score handling
 */
exports.submitMultipleJobRequirements = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('📥 Starting FIXED multi-JD screening process');

    let jobDescriptions = [];
    
    if (req.body.usePredefined) {
      jobDescriptions = Object.values(PREDEFINED_JOBS);
      console.log('🎯 Using predefined job descriptions:', Object.keys(PREDEFINED_JOBS));
    } else if (req.body.jobDescriptions && Array.isArray(req.body.jobDescriptions)) {
      jobDescriptions = req.body.jobDescriptions.map(normalizeJobRequirementsData);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide job descriptions or set usePredefined: true',
        code: 'INVALID_INPUT'
      });
    }

    console.log(`🔧 Processing ${jobDescriptions.length} job descriptions`);

    // Get processed resumes
    const resumes = await Resume.find({ isProcessed: true });
    console.log('📊 Found resumes:', resumes.length);

    if (resumes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processed resumes found',
        suggestion: 'Upload and process resumes first',
        code: 'NO_RESUMES'
      });
    }

    // ✅ CRITICAL FIX: Enhanced multi-JD processing
    console.log('🔄 Starting multi-JD candidate scoring...');
    const multiJobResults = [];

    for (let i = 0; i < resumes.length; i++) {
      const resume = resumes[i];
      console.log(`Processing candidate ${i + 1}/${resumes.length}: ${resume.candidateName}`);
      
      try {
        const result = await scoreMultipleJobsForCandidateData(resume, jobDescriptions);
        multiJobResults.push(result);
        console.log(`✅ Processed ${resume.candidateName} - Best: ${result.bestJob?.jobTitle} (${result.bestJob?.score}%)`);
      } catch (candidateError) {
        console.error(`❌ Failed to score ${resume.candidateName}:`, candidateError.message);
        // Add failed candidate with error details
        multiJobResults.push({
          ...resume.toObject(),
          multiJobScores: {},
          bestJob: { jobTitle: 'Processing Error', score: 0, category: 'error' },
          processingError: true,
          errorDetails: candidateError.message
        });
      }
    }

    // Sort by best job score
    multiJobResults.sort((a, b) => {
      const scoreA = Number(a.bestJob?.score || 0);
      const scoreB = Number(b.bestJob?.score || 0);
      return scoreB - scoreA;
    });
    
    const rankedResults = multiJobResults.map((candidate, index) => ({
      ...candidate,
      overallRank: index + 1
    }));

    // ✅ CRITICAL FIX: Proper statistics calculation
    const statistics = calculateScreeningStatisticsData(rankedResults, true);
    console.log('📊 Multi-JD statistics:', statistics);

    // ✅ CRITICAL FIX: Proper database results structure ensuring score preservation
    const databaseResults = rankedResults.map(candidate => {
      // ✅ ENSURE bestJob has the correct structure with guaranteed score field
      let bestJobMatch = null;
      if (candidate.bestJob) {
        bestJobMatch = {
          jobTitle: candidate.bestJob.jobTitle || 'Unknown',
          score: Number(candidate.bestJob.score) || 0,  // ✅ CRITICAL: Ensure score is a number
          category: candidate.bestJob.category || 'general'
        };
      }

      console.log(`💾 Saving ${candidate.candidateName} with bestJobMatch:`, bestJobMatch);

      return {
        resumeId: candidate._id,
        candidateName: candidate.candidateName || 'Unknown',
        bestJobMatch: bestJobMatch,  // ✅ Properly structured with guaranteed score
        allJobScores: candidate.multiJobScores || {},
        overallRank: candidate.overallRank,
        email: candidate.email,
        phone: candidate.phone,
        experienceYears: candidate.experience?.years || 0,
        education: candidate.education?.degree || candidate.education || 'Not specified',
        skills: candidate.skills || [],
        processingError: candidate.processingError || false,
        errorDetails: candidate.errorDetails || null
      };
    });

    // Save screening to database
    const screening = new Screening({
      jobTitle: 'Multi-JD Screening',
      jobDescription: `Screening across ${jobDescriptions.length} job types: ${jobDescriptions.map(j => j.jobTitle).join(', ')}`,
      requiredSkills: [...new Set(jobDescriptions.flatMap(j => j.requiredSkills))],
      results: databaseResults,
      statistics,
      screeningType: SCREENING_TYPES.MULTI_JD,
      totalCandidates: statistics.totalCandidates,
      jobCategories: jobDescriptions.map(j => j.jobTitle),
      processingStatus: 'completed',
      createdBy: req.user?.name || 'System'
    });

    await screening.save();

    const processingTime = Date.now() - startTime;
    const errorCount = rankedResults.filter(r => r.processingError).length;

    console.log(`✅ Multi-JD screening completed in ${processingTime}ms`);
    console.log(`📊 Results: ${rankedResults.length - errorCount} successful, ${errorCount} errors`);

    res.status(200).json({
      success: true,
      message: 'Multi-JD screening completed successfully',
      screeningId: screening._id,
      resultsUrl: `/screening/multi-results/${screening._id}`,
      statistics: {
        ...statistics,
        processingTimeMs: processingTime,
        jobCount: jobDescriptions.length,
        errorCount,
        successCount: rankedResults.length - errorCount
      },
      jobCategories: jobDescriptions.map(j => j.jobTitle),
      preview: {
        bestMatches: rankedResults
          .filter(c => !c.processingError)
          .slice(0, 5)
          .map(c => ({
            name: c.candidateName,
            bestJob: c.bestJob?.jobTitle,
            score: c.bestJob?.score,
            category: c.bestJob?.category,
            rank: c.overallRank
          }))
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Multi-JD screening failed:', error);
    
    res.status(500).json({
      success: false,
      error: `Multi-JD screening failed: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        message: error.message,
        code: error.code
      } : undefined,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
      code: 'MULTI_JD_PROCESSING_ERROR'
    });
  }
};

/**
 * ✅ FIXED: Get predefined job descriptions
 */
exports.getPredefinedJobs = async (req, res) => {
  try {
    res.json({
      success: true,
      jobs: Object.entries(PREDEFINED_JOBS).map(([key, job]) => ({
        key,
        ...job,
        skillCount: job.requiredSkills.length
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predefined jobs'
    });
  }
};

/**
 * ✅ FIXED: Enhanced screening configuration
 */
exports.getScreeningConfig = async (req, res) => {
  try {
    const processedResumeCount = await Resume.countDocuments({ isProcessed: true });

    res.json({
      success: true,
      config: {
        ...DEFAULT_SCREENING_CONFIG,
        availableJobTypes: Object.keys(PREDEFINED_JOBS)
      },
      limits: {
        maxResultsPerScreening: DEFAULT_SCREENING_CONFIG.MAX_RESULTS,
        availableResumes: processedResumeCount,
        supportedJobTypes: Object.keys(PREDEFINED_JOBS).length
      },
      supportedScreeningTypes: Object.values(SCREENING_TYPES),
      predefinedJobs: Object.keys(PREDEFINED_JOBS)
    });
  } catch (error) {
    console.error('Error fetching screening config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch screening configuration'
    });
  }
};

/**
 * ✅ FIXED: Enhanced job requirements validation
 */
exports.validateJobRequirements = async (req, res) => {
  try {
    const validation = validateJobRequirementsData(req.body);
    const normalized = normalizeJobRequirementsData(req.body);

    res.json({
      success: true,
      validation,
      normalized: validation.isValid ? normalized : null,
      suggestions: validation.isValid ? [] : [
        'Ensure job title is descriptive and at least 2 characters',
        'Provide required skills as an array or comma-separated string',
        'Set realistic experience ranges (0-50 years)'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate job requirements'
    });
  }
};

// ==================== ✅ FIXED MODULE EXPORTS ====================
module.exports = {
  submitJobRequirement: exports.submitJobRequirement,
  submitMultipleJobRequirements: exports.submitMultipleJobRequirements,
  getScreeningConfig: exports.getScreeningConfig,
  validateJobRequirements: exports.validateJobRequirements,
  getPredefinedJobs: exports.getPredefinedJobs
};
