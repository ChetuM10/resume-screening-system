/**
 * @fileoverview Score Calculator — extracted from matchingEngine.js
 * Owns: all domain-specific scoring functions and AI-based scoring.
 * Depends on domainDetector for shared utilities and constants.
 */

const logger = require("../utils/logger");
const {
  JOB_DOMAINS,
  normalise,
  calculateEducationRelevance,
  calculateExperienceScore,
} = require("./domainDetector");

// Gemini AI — optional
let geminiService = null;
const USE_AI = process.env.USE_AI_ENHANCEMENT === "true";

if (USE_AI) {
  try {
    geminiService = require("./geminiService");
    if (!geminiService || !geminiService.isAvailable()) geminiService = null;
  } catch (e) {
    geminiService = null;
  }
}

// ==================== DOMAIN-SPECIFIC SCORING FUNCTIONS ====================

function calculateNetworkEngineerScore(resume, job, jobTitle) {
  logger.debug(`🌐 Network Engineer scoring for ${resume.candidateName}`);

  const reasons = [];
  const resumeSkills = (resume.skills || []).map((s) => s.toLowerCase());
  const resumeText = (resume.extractedText || "").toLowerCase();
  const networkSkills = JOB_DOMAINS.network_engineer.skills;

  let skillScore = 0;
  let totalMatched = 0;
  let totalPossible = 0;

  Object.entries(networkSkills).forEach(([category, config]) => {
    const categoryMatches = config.skills.filter((skill) => {
      return (
        resumeSkills.some((resumeSkill) => {
          if (resumeSkill.includes(skill.replace(/[^a-z]/g, ""))) return true;
          if (skill.includes(resumeSkill.replace(/[^a-z]/g, ""))) return true;
          if (
            skill === "cisco meraki" &&
            (resumeText.includes("cisco meraki") || resumeText.includes("meraki"))
          )
            return true;
          if (
            skill === "thousandeyes" &&
            (resumeText.includes("thousandeyes") || resumeText.includes("thousand eyes"))
          )
            return true;
          if (
            skill === "tcp/ip" &&
            (resumeText.includes("tcp/ip") || resumeText.includes("tcpip"))
          )
            return true;
          return false;
        }) || resumeText.includes(skill)
      );
    });

    const categoryScore = (categoryMatches.length / config.skills.length) * config.weight;
    skillScore += categoryScore;
    totalMatched += categoryMatches.length;
    totalPossible += config.skills.length;

    if (categoryMatches.length > 0) {
      reasons.push(
        `${category}: ${categoryMatches.join(", ")} (${categoryMatches.length}/${config.skills.length})`
      );
    }
  });

  if (
    resumeText.includes("network engineer") ||
    (resumeText.includes("network") && resumeText.includes("engineer"))
  ) {
    skillScore += 20;
    reasons.push("Current network engineering experience (+20 bonus)");
  }

  if (resumeText.includes("cisco meraki") && resumeText.includes("thousandeyes")) {
    skillScore += 15;
    reasons.push("Exact tool match: Cisco Meraki + ThousandEyes (+15 bonus)");
  }

  const experienceYears = resume.experience?.years || 0;
  const { experienceScore, experiencePenalty } = calculateExperienceScore(
    experienceYears,
    job.minExp || 1,
    job.maxExp || 10,
    reasons
  );

  const educationResult = calculateEducationRelevance(
    resume.education?.degree || resume.education,
    "network_engineer"
  );
  reasons.push(educationResult.reason);

  const nonTechSkills = [
    "tally", "accounting", "finance", "excel", "office",
    "bookkeeping", "taxation", "digital marketing", "marketing",
  ];
  const hasNonTechSkills = resumeSkills.some((skill) =>
    nonTechSkills.some((nonTech) => skill.includes(nonTech))
  );

  let domainPenalty = 0;
  if (hasNonTechSkills && skillScore < 30) {
    domainPenalty = 40;
    reasons.push("Major domain mismatch: Non-technical background for network engineering (-40 penalty)");
  }

  const totalScore = Math.min(
    100,
    skillScore + experienceScore + educationResult.score - domainPenalty - experiencePenalty
  );
  const finalScore = Math.round(Math.max(5, totalScore));

  logger.debug(`📊 ${resume.candidateName} Network Engineer score: ${finalScore}%`);

  return {
    score: finalScore,
    matchScore: finalScore,
    skillsMatch: {
      matched: resumeSkills.filter((skill) =>
        Object.values(networkSkills).some((category) =>
          category.skills.some(
            (reqSkill) =>
              skill.includes(reqSkill.replace(/[^a-z]/g, "")) || reqSkill.includes(skill)
          )
        )
      ),
      missing: [],
      percentage: Math.round((totalMatched / totalPossible) * 100),
    },
    experienceMatch: experienceYears >= (job.minExp || 1),
    educationMatch: educationResult.score >= 12,
    domainPenalty: domainPenalty + experiencePenalty,
    reasons,
    jobCategory: "network_engineer",
  };
}

function calculateFinanceInternScore(resume, job, jobTitle) {
  logger.debug(`💰 Finance Intern scoring for ${resume.candidateName}`);

  const reasons = [];
  const resumeSkills = (resume.skills || []).map((s) => s.toLowerCase());
  const resumeText = (resume.extractedText || "").toLowerCase();
  const financeSkills = JOB_DOMAINS.finance_intern.skills;

  let skillScore = 0;

  Object.entries(financeSkills).forEach(([category, config]) => {
    const categoryMatches = config.skills.filter(
      (skill) =>
        resumeSkills.some(
          (resumeSkill) =>
            resumeSkill.includes(skill.replace(/[^a-z]/g, "")) || skill.includes(resumeSkill)
        ) || resumeText.includes(skill)
    );

    const categoryScore = (categoryMatches.length / config.skills.length) * config.weight;
    skillScore += categoryScore;

    if (categoryMatches.length > 0) {
      reasons.push(
        `${category}: ${categoryMatches.join(", ")} (${categoryMatches.length}/${config.skills.length})`
      );
    }
  });

  if (
    resumeText.includes("finance intern") ||
    resumeText.includes("biocon") ||
    resumeText.includes("financial")
  ) {
    skillScore += 25;
    reasons.push("Finance internship/experience detected (+25 bonus)");
  }

  if (resumeText.includes("mba") || resumeText.includes("master of business")) {
    skillScore += 15;
    reasons.push("MBA degree (+15 bonus)");
  }

  const experienceYears = resume.experience?.years || 0;
  const { experienceScore, experiencePenalty } = calculateExperienceScore(
    experienceYears,
    job.minExp || 0,
    job.maxExp || 10,
    reasons
  );

  const educationResult = calculateEducationRelevance(
    resume.education?.degree || resume.education,
    "finance_intern"
  );
  reasons.push(educationResult.reason);

  const techSkills = [
    "javascript", "python", "java", "react", "node.js",
    "programming", "developer", "software", "coding",
  ];
  const hasTechSkills = resumeSkills.some((skill) =>
    techSkills.some((tech) => skill.includes(tech))
  );

  let techPenalty = 0;
  if (hasTechSkills && skillScore < 40) {
    techPenalty = 30;
    reasons.push("Strong technical background - likely not suitable for finance role (-30 penalty)");
  }

  const totalScore = Math.min(
    100,
    skillScore + experienceScore + educationResult.score - techPenalty - experiencePenalty
  );
  const finalScore = Math.round(Math.max(5, totalScore));

  logger.debug(`📊 ${resume.candidateName} Finance Intern score: ${finalScore}%`);

  return {
    score: finalScore,
    matchScore: finalScore,
    skillsMatch: {
      matched: resumeSkills.filter((skill) =>
        Object.values(financeSkills).some((category) =>
          category.skills.some((reqSkill) =>
            skill.includes(reqSkill.replace(/[^a-z]/g, ""))
          )
        )
      ),
      missing: [],
      percentage: Math.round((skillScore / 100) * 100),
    },
    experienceMatch: experienceYears >= (job.minExp || 0),
    educationMatch: educationResult.score >= 15,
    domainPenalty: techPenalty + experiencePenalty,
    reasons,
    jobCategory: "finance_intern",
  };
}

function calculateFullStackScore(resume, job, jobTitle) {
  const { requiredSkills, minExp, maxExp, educationLevel } = job;
  const reasons = [];

  logger.debug(`🎯 Full Stack scoring for ${resume.candidateName}`);

  const fullStackSkills = {
    frontend: {
      weight: 25,
      skills: ["javascript", "js", "html", "css", "react", "angular", "vue", "bootstrap", "jquery"],
    },
    backend: {
      weight: 25,
      skills: ["node.js", "express.js", "express", "python", "java", "php", "django", "spring", "fastapi"],
    },
    database: {
      weight: 20,
      skills: ["mongodb", "mysql", "postgresql", "nosql", "sql", "redis", "sqlite"],
    },
    tools: {
      weight: 15,
      skills: ["git", "github", "aws", "docker", "postman", "rest", "api", "gitlab", "npm", "yarn"],
    },
    concepts: {
      weight: 15,
      skills: ["restful", "mvc", "microservices", "oop", "data structures", "algorithms", "json", "ajax"],
    },
  };

  const resumeSkillsLower = (resume.skills || []).map((s) => s.toLowerCase());
  let skillScore = 0;
  let totalMatched = 0;
  let totalRequired = 0;

  Object.entries(fullStackSkills).forEach(([category, config]) => {
    const categoryMatches = config.skills.filter((skill) =>
      resumeSkillsLower.some((resumeSkill) => {
        return (
          resumeSkill === skill ||
          resumeSkill.includes(skill) ||
          skill.includes(resumeSkill) ||
          (skill === "javascript" && (resumeSkill.includes("js") || resumeSkill.includes("node"))) ||
          (skill === "express.js" && resumeSkill.includes("express")) ||
          (skill === "mongodb" && resumeSkill.includes("mongo"))
        );
      })
    );

    const categoryScore = (categoryMatches.length / config.skills.length) * config.weight;
    skillScore += categoryScore;
    totalMatched += categoryMatches.length;
    totalRequired += config.skills.length;

    if (categoryMatches.length > 0) {
      reasons.push(
        `${category}: ${categoryMatches.join(", ")} (${categoryMatches.length}/${config.skills.length})`
      );
    }
  });

  const projectKeywords = ["full.?stack", "web.?app", "restful", "api", "frontend", "backend", "mern", "mean"];
  const extractedText = (resume.extractedText || "").toLowerCase();
  const projectMatches = projectKeywords.filter((keyword) => new RegExp(keyword).test(extractedText));
  const projectBonus = projectMatches.length * 4;
  skillScore = Math.min(70, skillScore + projectBonus);

  if (projectMatches.length > 0) {
    reasons.push(`Project experience: ${projectMatches.join(", ")} (+${projectBonus} bonus)`);
  }

  const experienceYears = resume.experience?.years || 0;
  const { experienceScore, experiencePenalty } = calculateExperienceScore(
    experienceYears,
    minExp || 0,
    maxExp || 10,
    reasons
  );

  let educationScore = 0;
  const education = (resume.education?.degree || resume.education || "").toLowerCase();

  if (/mca|computer|engineering|technology|bca/.test(education)) {
    educationScore = 10;
    reasons.push(`Technical education: ${resume.education?.degree || education}`);
  } else if (/bachelor|degree/.test(education)) {
    educationScore = 6;
    reasons.push(`General degree: ${resume.education?.degree || education}`);
  } else {
    educationScore = 2;
    reasons.push(`Education not specified or non-technical`);
  }

  const nonTechSkills = [
    "tally", "accounting", "finance", "excel", "office",
    "bookkeeping", "taxation", "digital marketing",
  ];
  const hasNonTechSkills = resumeSkillsLower.some((skill) =>
    nonTechSkills.some((nonTech) => skill.includes(nonTech))
  );

  let domainPenalty = 0;
  if (hasNonTechSkills && skillScore < 25) {
    domainPenalty = 35;
    reasons.push("Major domain mismatch: Non-technical background for development role (-35 penalty)");
  }

  const totalScore =
    skillScore + experienceScore + educationScore - domainPenalty - experiencePenalty;
  const finalScore = Math.round(Math.min(100, Math.max(5, totalScore)));

  logger.debug(`📊 ${resume.candidateName} Full Stack score: ${finalScore}%`);

  return {
    score: finalScore,
    matchScore: finalScore,
    skillsMatch: {
      matched: resumeSkillsLower.filter((skill) =>
        Object.values(fullStackSkills).some((category) =>
          category.skills.some(
            (reqSkill) => skill.includes(reqSkill) || reqSkill.includes(skill)
          )
        )
      ),
      missing: requiredSkills.filter(
        (req) => !resumeSkillsLower.some((skill) => skill.includes(req.toLowerCase()))
      ),
      percentage: Math.round((totalMatched / totalRequired) * 100),
    },
    experienceMatch: experienceYears >= (minExp || 0) * 0.7,
    educationMatch: /mca|computer|engineering|bca/.test(education),
    domainPenalty: domainPenalty + experiencePenalty,
    reasons,
    jobCategory: "full_stack_developer",
  };
}

function calculateSoftwareDeveloperScore(resume, job, jobTitle) {
  logger.debug(`💻 Software Developer scoring for ${resume.candidateName}`);

  const fullStackResult = calculateFullStackScore(resume, job, jobTitle);
  const adjustedScore = Math.min(100, fullStackResult.score + 10);

  return {
    ...fullStackResult,
    score: adjustedScore,
    matchScore: adjustedScore,
    jobCategory: "software_developer",
  };
}

// ==================== AI-ENHANCED SCORING ====================

async function calculateAIBasedScore(resume, job, jobTitle, jobCategory) {
  logger.debug(`🤖 AI-based scoring for ${resume.candidateName} - ${jobTitle}`);

  if (!geminiService || !geminiService.calculateSemanticMatchDetailed) {
    logger.debug("⚠️ AI not available for semantic matching");
    return {
      score: 50,
      matchScore: 50,
      skillsMatch: { matched: [], missing: [], percentage: 50 },
      experienceMatch: false,
      educationMatch: false,
      reasons: ["AI scoring not available - default score assigned"],
      jobCategory: "general",
    };
  }

  try {
    const aiResult = await geminiService.calculateSemanticMatchDetailed(
      resume.extractedText || JSON.stringify(resume),
      job.description || "",
      jobCategory
    );

    logger.debug(`✅ AI Score: ${aiResult.score}% - ${aiResult.recommendation}`);

    return {
      score: aiResult.score,
      matchScore: aiResult.score,
      skillsMatch: {
        matched: aiResult.strengths || [],
        missing: aiResult.gaps || [],
        percentage: aiResult.score,
      },
      experienceMatch: aiResult.score >= 60,
      educationMatch: aiResult.score >= 50,
      reasons: [
        `AI Analysis: ${aiResult.reasoning}`,
        `Recommendation: ${aiResult.recommendation}`,
        ...aiResult.strengths.map((s) => `✓ Strength: ${s}`),
        ...aiResult.gaps.map((g) => `✗ Gap: ${g}`),
      ],
      jobCategory: "ai_scored",
      aiEnhanced: true,
      aiConfidence: aiResult.confidence,
    };
  } catch (error) {
    logger.error("❌ AI scoring failed:", error.message);
    return {
      score: 50,
      matchScore: 50,
      skillsMatch: { matched: [], missing: [], percentage: 50 },
      experienceMatch: false,
      educationMatch: false,
      reasons: [`AI scoring error: ${error.message}`],
      jobCategory: "general",
    };
  }
}

module.exports = {
  calculateNetworkEngineerScore,
  calculateFinanceInternScore,
  calculateFullStackScore,
  calculateSoftwareDeveloperScore,
  calculateAIBasedScore,
};
