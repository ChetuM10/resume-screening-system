/**
 * @fileoverview AI-FIRST Multi-JD Resume-Job Matching Engine — Orchestrator
 * @version 6.0.0 - Refactored: domain detection and scoring extracted to sub-modules
 *
 * Sub-modules:
 *   services/domainDetector.js  — JOB_DOMAINS, utilities, detectJobCategory
 *   services/scoreCalculator.js — all calculate*Score functions
 */

const logger = require("../utils/logger");

// Domain detection
const {
  JOB_DOMAINS,
  EDUCATION_RELEVANCE,
  normalise,
  calculateEducationRelevance,
  calculateExperienceScore,
  detectJobCategory,
} = require("./domainDetector");

// Domain-specific and AI scoring
const {
  calculateNetworkEngineerScore,
  calculateFinanceInternScore,
  calculateFullStackScore,
  calculateSoftwareDeveloperScore,
  calculateAIBasedScore,
} = require("./scoreCalculator");

// Gemini AI — needed here for borderline score enhancement in scoreCandidate
let geminiService = null;
const USE_AI = process.env.USE_AI_ENHANCEMENT === "true";

if (USE_AI) {
  try {
    geminiService = require("./geminiService");
    if (geminiService && geminiService.isAvailable()) {
      logger.debug("✅ Gemini AI service loaded - AI-FIRST mode enabled");
    } else {
      logger.debug("⚠️ Gemini AI configured but not available");
      geminiService = null;
    }
  } catch (error) {
    logger.debug("⚠️ Gemini AI not available, using rule-based scoring only");
    logger.error("AI Load Error:", error.message);
    geminiService = null;
  }
}

// ==================== MAIN SCORING FUNCTION (AI-FIRST) ====================

/**
 * ✅ AI-FIRST Single job scoring with experience penalties
 */
async function scoreCandidate(
  resume,
  {
    requiredSkills = [],
    minExp = 0,
    maxExp = 100,
    educationLevel = "",
    jobTitle = "",
    jobDescription = "",
  } = {}
) {
  if (
    !resume ||
    !resume.candidateName ||
    resume.candidateName === "Unknown Candidate"
  ) {
    logger.debug(`❌ Invalid resume data`);
    return {
      matchScore: 0,
      skillsMatch: { matched: [], missing: requiredSkills, percentage: 0 },
      experienceMatch: false,
      educationMatch: false,
      reasons: ["Invalid candidate data"],
      jobCategory: "invalid",
    };
  }

  logger.debug(`\n🎯 AI-FIRST Scoring: ${resume.candidateName} for ${jobTitle}`);

  const jobCategory = await detectJobCategory(
    jobDescription,
    jobTitle,
    requiredSkills
  );

  const jobData = {
    requiredSkills,
    minExp,
    maxExp,
    educationLevel,
    description: jobDescription,
  };

  let result;

  try {
    if (jobCategory === "general") {
      logger.debug("🤖 Category is 'general' - using AI semantic scoring");
      result = await calculateAIBasedScore(resume, jobData, jobTitle, jobCategory);
    } else {
      logger.debug(`📋 Using rule-based scoring for: ${jobCategory}`);
      switch (jobCategory) {
        case "network_engineer":
          result = calculateNetworkEngineerScore(resume, jobData, jobTitle);
          break;
        case "finance_intern":
          result = calculateFinanceInternScore(resume, jobData, jobTitle);
          break;
        case "full_stack_developer":
          result = calculateFullStackScore(resume, jobData, jobTitle);
          break;
        case "software_developer":
          result = calculateSoftwareDeveloperScore(resume, jobData, jobTitle);
          break;
        default:
          result = await calculateAIBasedScore(resume, jobData, jobTitle, jobCategory);
      }
    }

    logger.debug(`✅ Final Score: ${result.score}%\n`);

    return {
      matchScore: result.score,
      skillsMatch: result.skillsMatch,
      experienceMatch: result.experienceMatch,
      educationMatch: result.educationMatch,
      jobCategory,
      mlCategory: "N/A",
      mlConfidence: 0,
      relevancePenalty: result.domainPenalty || 0,
      reasons: result.reasons,
      aiEnhanced: result.aiEnhanced || false,
    };
  } catch (error) {
    logger.error(`❌ Scoring failed for ${resume.candidateName}:`, error);
    return {
      matchScore: 5,
      skillsMatch: { matched: [], missing: requiredSkills, percentage: 0 },
      experienceMatch: false,
      educationMatch: false,
      jobCategory: "error",
      reasons: ["Error in scoring - assigned minimum score"],
    };
  }
}

/**
 * ✅ Multi-JD scoring
 */
async function scoreMultipleJobs(resume, jobDescriptions) {
  if (!resume || !Array.isArray(jobDescriptions) || jobDescriptions.length === 0) {
    throw new Error("Invalid parameters for multi-JD scoring");
  }

  const results = {};
  logger.debug(
    `\n🎯 Multi-JD AI-FIRST scoring for ${resume.candidateName} against ${jobDescriptions.length} jobs`
  );

  for (const jd of jobDescriptions) {
    try {
      logger.debug(`\n  📋 Scoring against: ${jd.jobTitle}`);

      const singleResult = await scoreCandidate(resume, {
        requiredSkills: jd.requiredSkills || [],
        minExp: jd.minExp || 0,
        maxExp: jd.maxExp || 50,
        educationLevel: jd.educationLevel || "",
        jobTitle: jd.jobTitle,
        jobDescription: jd.jobDescription,
      });

      results[jd.jobTitle] = { ...singleResult, jobTitle: jd.jobTitle };

      logger.debug(`  ✅ ${jd.jobTitle}: ${singleResult.matchScore}%`);
    } catch (jobError) {
      logger.error(
        `❌ Failed to score ${resume.candidateName} for ${jd.jobTitle}:`,
        jobError.message
      );
      results[jd.jobTitle] = {
        score: 5,
        matchScore: 5,
        skillsMatch: { matched: [], missing: jd.requiredSkills || [], percentage: 0 },
        experienceMatch: false,
        educationMatch: false,
        reasons: [`Error scoring for ${jd.jobTitle}: ${jobError.message}`],
        jobCategory: "error",
        jobTitle: jd.jobTitle,
      };
    }
  }

  logger.debug(`\n✅ Multi-JD scoring completed for ${resume.candidateName}\n`);
  return results;
}

// ==================== UTILITY FUNCTIONS ====================

function strictSkillMatch(resumeSkills = [], requiredSkills = []) {
  if (!Array.isArray(resumeSkills) || !Array.isArray(requiredSkills)) {
    return { matched: [], missing: [], percentage: 0 };
  }

  const resumeSkillsLower = resumeSkills.map((s) => String(s).toLowerCase().trim());
  const requiredSkillsLower = requiredSkills.map((s) => String(s).toLowerCase().trim());

  const matched = requiredSkills.filter((reqSkill) => {
    const reqLower = reqSkill.toLowerCase().trim();
    return resumeSkillsLower.some(
      (resSkill) =>
        resSkill === reqLower || resSkill.includes(reqLower) || reqLower.includes(resSkill)
    );
  });

  const missing = requiredSkills.filter((reqSkill) => {
    const reqLower = reqSkill.toLowerCase().trim();
    return !resumeSkillsLower.some(
      (resSkill) =>
        resSkill === reqLower || resSkill.includes(reqLower) || reqLower.includes(resSkill)
    );
  });

  const percentage =
    requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0;

  return { matched, missing, percentage };
}

function calculateSkillMatch(resumeSkills = [], requiredSkills = []) {
  const result = strictSkillMatch(resumeSkills, requiredSkills);
  return result.percentage;
}

function validateSkillsRelevance(resumeSkills = [], jobCategory = "general", jobTitle = "") {
  if (!Array.isArray(resumeSkills) || resumeSkills.length === 0) {
    return { isRelevant: true, penalty: 0, reason: "No skills to validate" };
  }

  const resumeSkillsLower = resumeSkills.map((s) => String(s).toLowerCase().trim());
  const jobLower = `${jobCategory} ${jobTitle}`.toLowerCase();

  const irrelevantPatterns = {
    finance: ["javascript", "python", "java", "react", "node", "programming", "developer", "software", "coding", "html", "css", "angular", "vue"],
    accounting: ["javascript", "python", "java", "react", "node", "programming", "developer", "software", "coding"],
    technical: ["tally", "accounting", "finance", "bookkeeping", "taxation", "audit", "gst"],
    development: ["tally", "accounting", "finance", "bookkeeping", "taxation"],
  };

  if (jobLower.includes("finance") || jobLower.includes("accounting") || jobLower.includes("audit")) {
    const hasTechnicalSkills = resumeSkillsLower.some((skill) =>
      irrelevantPatterns.finance.some((pattern) => skill.includes(pattern))
    );
    if (hasTechnicalSkills) {
      return { isRelevant: false, penalty: 0.3, reason: "Technical skills not relevant for finance role" };
    }
  }

  if (jobLower.includes("developer") || jobLower.includes("engineer") || jobLower.includes("software")) {
    const hasFinanceSkills = resumeSkillsLower.some((skill) =>
      irrelevantPatterns.technical.some((pattern) => skill.includes(pattern))
    );
    if (hasFinanceSkills) {
      return { isRelevant: false, penalty: 0.3, reason: "Finance skills not relevant for technical role" };
    }
  }

  return { isRelevant: true, penalty: 0, reason: "Skills are relevant" };
}

function calculateMatchScore(resume, job) {
  if (!resume || !job) return 0;

  const skillMatch = calculateSkillMatch(resume.skills || [], job.requiredSkills || []);
  const experienceMatch = (resume.experience?.years || 0) >= (job.minExp || 0) ? 20 : 10;
  const educationMatch = resume.education?.degree ? 10 : 0;

  return Math.min(100, Math.round(skillMatch * 0.7 + experienceMatch + educationMatch));
}

function validateEducation(education = "", jobCategory = "general") {
  if (!education) {
    return { suitable: true, penalty: 0, reason: "No education specified" };
  }

  const eduLower = education.toLowerCase();
  const relevance = EDUCATION_RELEVANCE[jobCategory] || EDUCATION_RELEVANCE.software_developer;

  if (relevance.highly_relevant.some((edu) => eduLower.includes(edu))) {
    return { suitable: true, penalty: 0, reason: "Highly relevant education" };
  }

  if (relevance.somewhat_relevant.some((edu) => eduLower.includes(edu))) {
    return { suitable: true, penalty: 0.1, reason: "Somewhat relevant education" };
  }

  if (relevance.not_relevant.some((edu) => eduLower.includes(edu))) {
    return { suitable: false, penalty: 0.2, reason: "Education not relevant" };
  }

  return { suitable: true, penalty: 0, reason: "General education" };
}

async function calculateEnhancedCandidateScore(resume, job, jobTitle) {
  return await calculateAIBasedScore(resume, job, jobTitle, "general");
}

// ==================== MODULE EXPORTS ====================

module.exports = {
  // Main scoring functions
  scoreCandidate,
  scoreMultipleJobs,

  // Domain-specific scoring (re-exported for backwards compatibility)
  calculateNetworkEngineerScore,
  calculateFinanceInternScore,
  calculateFullStackScore,
  detectJobCategory,

  // Data
  JOB_DOMAINS,

  // Test utilities
  strictSkillMatch,
  calculateSkillMatch,
  calculateMatchScore,
  calculateEnhancedCandidateScore,

  // Utility functions
  utils: {
    validateSkillsRelevance,
    validateEducation,
    normalise,
    calculateEducationRelevance,
    calculateExperienceScore,
  },
};
