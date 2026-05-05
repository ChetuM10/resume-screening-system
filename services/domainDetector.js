/**
 * @fileoverview Domain Detector — extracted from matchingEngine.js
 * Owns: JOB_DOMAINS, EDUCATION_RELEVANCE, shared utility functions,
 * and the AI-first detectJobCategory function.
 */

const logger = require("../utils/logger");

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

// ==================== JOB DOMAINS ====================

const JOB_DOMAINS = {
  network_engineer: {
    primaryKeywords: [
      "network",
      "cisco",
      "routing",
      "switching",
      "infrastructure",
    ],
    skills: {
      protocols: {
        weight: 35,
        skills: [
          "tcp/ip",
          "ospf",
          "hsrp",
          "vlan",
          "dhcp",
          "stp",
          "bgp",
          "snmp",
        ],
      },
      tools: {
        weight: 30,
        skills: [
          "cisco meraki",
          "thousandeyes",
          "ping",
          "traceroute",
          "tracert",
          "network monitoring",
        ],
      },
      technologies: {
        weight: 25,
        skills: [
          "routing",
          "switching",
          "lan",
          "wan",
          "vpn",
          "firewalls",
          "load balancers",
        ],
      },
      certifications: {
        weight: 10,
        skills: [
          "ccna",
          "ccnp",
          "network security",
          "itil",
          "cloud networking",
        ],
      },
    },
  },
  full_stack_developer: {
    primaryKeywords: [
      "full stack",
      "developer",
      "web development",
      "frontend",
      "backend",
    ],
    skills: {
      frontend: {
        weight: 25,
        skills: [
          "javascript",
          "js",
          "html5",
          "css3",
          "react",
          "angular",
          "vue.js",
          "bootstrap",
        ],
      },
      backend: {
        weight: 25,
        skills: [
          "node.js",
          "express.js",
          "python",
          "java",
          "django",
          "spring",
          "restful apis",
        ],
      },
      database: {
        weight: 20,
        skills: [
          "mongodb",
          "mysql",
          "postgresql",
          "nosql",
          "sql",
          "database design",
        ],
      },
      tools: {
        weight: 15,
        skills: [
          "git",
          "github",
          "docker",
          "aws",
          "postman",
          "mvc architecture",
        ],
      },
      concepts: {
        weight: 15,
        skills: [
          "rest apis",
          "microservices",
          "agile",
          "version control",
          "testing frameworks",
        ],
      },
    },
  },
  software_developer: {
    primaryKeywords: [
      "software",
      "developer",
      "programming",
      "coding",
      "intern",
    ],
    skills: {
      programming: {
        weight: 40,
        skills: [
          "javascript",
          "python",
          "java",
          "node.js",
          "express.js",
          "programming fundamentals",
        ],
      },
      web_tech: {
        weight: 25,
        skills: ["html", "css", "web technologies", "api integration"],
      },
      database: {
        weight: 20,
        skills: ["sql", "nosql", "mongodb", "database management"],
      },
      tools: {
        weight: 10,
        skills: [
          "git",
          "version control",
          "jwt authentication",
          "agile methodologies",
        ],
      },
      concepts: {
        weight: 5,
        skills: ["software development principles", "debugging", "testing"],
      },
    },
  },
  finance_intern: {
    primaryKeywords: [
      "finance",
      "accounting",
      "financial",
      "audit",
      "budget",
      "customs",
      "taxation",
      "tax",
      "hmrc",
      "due diligence",
      "compliance",
      "oracle erp",
      "sap",
      "general ledger",
      "reconciliation",
      "journal posting",
      "period end close",
    ],
    skills: {
      finance: {
        weight: 40,
        skills: [
          "financial analysis",
          "accounting",
          "budgeting",
          "financial modeling",
          "audit",
          "customs",
          "taxation",
          "compliance",
        ],
      },
      software: {
        weight: 30,
        skills: [
          "tally erp9",
          "excel",
          "power bi",
          "tableau",
          "ms office",
          "oracle erp",
          "sap",
        ],
      },
      domain: {
        weight: 20,
        skills: [
          "gst",
          "taxation",
          "financial reporting",
          "accounts payable",
          "accounts receivable",
          "general ledger",
          "journal posting",
        ],
      },
      skills: {
        weight: 10,
        skills: [
          "analytical skills",
          "attention to detail",
          "communication",
          "research",
        ],
      },
    },
  },
};

// ==================== EDUCATION RELEVANCE ====================

const EDUCATION_RELEVANCE = {
  network_engineer: {
    highly_relevant: [
      "computer science",
      "information technology",
      "engineering",
      "b.tech",
      "m.tech",
      "mca",
      "bca",
    ],
    somewhat_relevant: ["electronics", "telecommunications"],
    not_relevant: ["commerce", "finance", "accounting", "mba", "bba"],
  },
  full_stack_developer: {
    highly_relevant: [
      "computer science",
      "software engineering",
      "mca",
      "bca",
      "b.tech",
      "m.tech",
    ],
    somewhat_relevant: ["engineering", "mathematics"],
    not_relevant: ["commerce", "finance", "accounting", "mba"],
  },
  software_developer: {
    highly_relevant: [
      "computer science",
      "software engineering",
      "mca",
      "bca",
      "b.tech",
      "m.tech",
    ],
    somewhat_relevant: ["engineering", "mathematics", "information technology"],
    not_relevant: ["commerce", "finance", "accounting"],
  },
  finance_intern: {
    highly_relevant: [
      "finance",
      "accounting",
      "commerce",
      "mba",
      "bba",
      "b.com",
      "m.com",
    ],
    somewhat_relevant: ["economics", "business administration"],
    not_relevant: ["computer science", "engineering", "technology"],
  },
};

// ==================== UTILITY FUNCTIONS ====================

function normalise(word = "") {
  return String(word).toLowerCase().trim();
}

function calculateEducationRelevance(education, jobCategory) {
  if (!education) {
    return { score: 5, reason: "No education specified" };
  }

  const eduLower = String(education).toLowerCase();
  const relevance =
    EDUCATION_RELEVANCE[jobCategory] || EDUCATION_RELEVANCE.software_developer;

  if (relevance.highly_relevant.some((edu) => eduLower.includes(edu))) {
    return { score: 15, reason: `Highly relevant education: ${education}` };
  }

  if (relevance.somewhat_relevant.some((edu) => eduLower.includes(edu))) {
    return { score: 10, reason: `Somewhat relevant education: ${education}` };
  }

  if (relevance.not_relevant.some((edu) => eduLower.includes(edu))) {
    return {
      score: 3,
      reason: `Education not ideal for this role: ${education}`,
    };
  }

  return { score: 7, reason: `General education: ${education}` };
}

function calculateExperienceScore(candidateYears, minExp, maxExp, reasons) {
  let experienceScore = 0;
  let experiencePenalty = 0;

  if (minExp === 0) {
    if (candidateYears === 0) {
      experienceScore = 15;
      reasons.push("Fresher role - perfect match");
    } else if (candidateYears <= 2) {
      experienceScore = 18;
      reasons.push(`Experience: ${candidateYears} years (good for entry-level)`);
    } else {
      experienceScore = 12;
      reasons.push(`Experience: ${candidateYears} years (may be overqualified)`);
    }
    return { experienceScore, experiencePenalty };
  }

  if (candidateYears >= minExp && candidateYears <= maxExp) {
    experienceScore = 20;
    reasons.push(`Experience: ${candidateYears} years (ideal for role)`);
  } else if (candidateYears > maxExp) {
    experienceScore = 15;
    reasons.push(`Experience: ${candidateYears} years (above maximum)`);
  } else if (candidateYears > 0 && candidateYears < minExp) {
    const gap = minExp - candidateYears;
    if (gap === 1) {
      experienceScore = 12;
      experiencePenalty = 10;
      reasons.push(`Experience: ${candidateYears} years (1 year below minimum, -10 penalty)`);
    } else if (gap === 2) {
      experienceScore = 8;
      experiencePenalty = 15;
      reasons.push(`Experience: ${candidateYears} years (2 years below minimum, -15 penalty)`);
    } else {
      experienceScore = 5;
      experiencePenalty = 20;
      reasons.push(`Experience: ${candidateYears} years (${gap} years below minimum, -20 penalty)`);
    }
  } else if (candidateYears === 0 && minExp > 0) {
    if (minExp === 1) {
      experienceScore = 8;
      experiencePenalty = 15;
      reasons.push(`Fresher (role requires ${minExp} year, -15 penalty - trainable)`);
    } else if (minExp === 2) {
      experienceScore = 5;
      experiencePenalty = 20;
      reasons.push(`Fresher (role requires ${minExp} years, -20 penalty)`);
    } else {
      experienceScore = 3;
      experiencePenalty = 25;
      reasons.push(`Fresher (role requires ${minExp}+ years, -25 penalty - significant gap)`);
    }
  }

  return { experienceScore, experiencePenalty };
}

// ==================== AI-FIRST JOB DETECTION ====================

// Per-process cache: job titles don't change between candidates in the same
// screening run. 105 candidates × 4 jobs → 4 lookups instead of 420.
const _categoryCache = new Map();

async function detectJobCategory(jobDescription, jobTitle, requiredSkills = []) {
  const cacheKey = `${jobTitle.toLowerCase().trim()}||${jobDescription.toLowerCase().trim().slice(0, 100)}`;

  if (_categoryCache.has(cacheKey)) {
    const cached = _categoryCache.get(cacheKey);
    logger.debug(`⚡ Cache hit for job category: ${jobTitle} → ${cached}`);
    return cached;
  }

  logger.debug(`🎯 Detecting job category for: ${jobTitle}`);

  if (geminiService && geminiService.detectJobDomain) {
    try {
      logger.debug("🤖 Using AI for job detection...");
      const aiResult = await geminiService.detectJobDomain(
        jobTitle,
        jobDescription,
        requiredSkills
      );

      if (aiResult.confidence > 0.6) {
        logger.debug(
          `✅ AI Detection: ${aiResult.domain} (${Math.round(aiResult.confidence * 100)}% confident)`
        );
        logger.debug(`   Reasoning: ${aiResult.reasoning}`);

        const domainMap = {
          software_development: "software_developer",
          web_development: "full_stack_developer",
          data_science: "software_developer",
          network_engineering: "network_engineer",
          finance: "finance_intern",
          accounting: "finance_intern",
          taxation: "finance_intern",
          customs: "finance_intern",
          marketing: "general",
          human_resources: "general",
          sales: "general",
          operations: "general",
          design: "general",
          general: "general",
        };

        const result = domainMap[aiResult.domain] || "general";
        _categoryCache.set(cacheKey, result);
        return result;
      } else {
        logger.debug(
          `⚠️ AI confidence too low (${Math.round(aiResult.confidence * 100)}%), trying keywords...`
        );
      }
    } catch (error) {
      logger.error("❌ AI detection error:", error.message);
      logger.debug("⚠️ Falling back to keyword matching");
    }
  } else {
    logger.debug("⚠️ AI not available, using keyword matching");
  }

  // Keyword-based fallback
  logger.debug("🔍 Using keyword-based detection as fallback...");
  const text = (jobDescription + " " + jobTitle).toLowerCase();
  let maxScore = 0;
  let bestMatch = "general";

  Object.entries(JOB_DOMAINS).forEach(([category, config]) => {
    let score = 0;
    config.primaryKeywords.forEach((keyword) => {
      if (text.includes(keyword.toLowerCase())) score++;
    });
    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  });

  if (maxScore >= 2) {
    logger.debug(`🔍 Keyword Detection: ${bestMatch} (score: ${maxScore})`);
    _categoryCache.set(cacheKey, bestMatch);
    return bestMatch;
  }

  logger.debug(`⚠️ No strong keyword match, defaulting to 'general'`);
  _categoryCache.set(cacheKey, "general");
  return "general";
}

module.exports = {
  JOB_DOMAINS,
  EDUCATION_RELEVANCE,
  normalise,
  calculateEducationRelevance,
  calculateExperienceScore,
  detectJobCategory,
};
