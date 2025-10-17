/**
 * @fileoverview AI-FIRST Multi-JD Resume-Job Matching Engine with Experience Penalties
 * AI handles job detection and scoring by default, rules are fallback only
 * @author Resume Screening System
 * @version 5.1.0 - Experience-Aware Scoring
 */

const Fuse = require("fuse.js");

// Optional ML Classifier integration
let MLClassifier;
try {
  MLClassifier = require("./mlClassifier");
} catch (e) {
  console.log("MLClassifier not found - using fallback scoring");
  MLClassifier = null;
}

// ==================== GEMINI AI INTEGRATION (PRIORITY) ====================
let geminiService = null;
const USE_AI = process.env.USE_AI_ENHANCEMENT === "true";

if (USE_AI) {
  try {
    geminiService = require("./geminiService");
    if (geminiService && geminiService.isAvailable()) {
      console.log("✅ Gemini AI service loaded - AI-FIRST mode enabled");
    } else {
      console.log("⚠️ Gemini AI configured but not available");
      geminiService = null;
    }
  } catch (error) {
    console.log("⚠️ Gemini AI not available, using rule-based scoring only");
    console.error("AI Load Error:", error.message);
    geminiService = null;
  }
}

// ==================== ENHANCED JOB CATEGORIES AND SKILLS ====================

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

/**
 * Education relevance mapping for each domain
 */
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

/**
 * Calculate education relevance score
 */
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

/**
 * ✅ BALANCED EXPERIENCE SCORING FUNCTION
 * More realistic penalties that don't over-penalize freshers
 */
function calculateExperienceScore(candidateYears, minExp, maxExp, reasons) {
  let experienceScore = 0;
  let experiencePenalty = 0;

  // Handle fresher roles (minExp = 0)
  if (minExp === 0) {
    if (candidateYears === 0) {
      experienceScore = 15; // Freshers are perfect for fresher roles
      reasons.push("Fresher role - perfect match");
    } else if (candidateYears <= 2) {
      experienceScore = 18; // Some experience is good
      reasons.push(
        `Experience: ${candidateYears} years (good for entry-level)`
      );
    } else {
      experienceScore = 12; // Too much experience might be overqualified
      reasons.push(
        `Experience: ${candidateYears} years (may be overqualified)`
      );
    }
    return { experienceScore, experiencePenalty };
  }

  // Handle experienced roles (minExp > 0)
  if (candidateYears >= minExp && candidateYears <= maxExp) {
    // Perfect range
    experienceScore = 20;
    reasons.push(`Experience: ${candidateYears} years (ideal for role)`);
  } else if (candidateYears > maxExp) {
    // Above maximum (slightly overqualified)
    experienceScore = 15;
    reasons.push(`Experience: ${candidateYears} years (above maximum)`);
  } else if (candidateYears > 0 && candidateYears < minExp) {
    // Below minimum but has some experience
    const gap = minExp - candidateYears;

    if (gap === 1) {
      // Only 1 year short - minor penalty
      experienceScore = 12;
      experiencePenalty = 10;
      reasons.push(
        `Experience: ${candidateYears} years (1 year below minimum, -10 penalty)`
      );
    } else if (gap === 2) {
      // 2 years short - moderate penalty
      experienceScore = 8;
      experiencePenalty = 15;
      reasons.push(
        `Experience: ${candidateYears} years (2 years below minimum, -15 penalty)`
      );
    } else {
      // 3+ years short - significant penalty
      experienceScore = 5;
      experiencePenalty = 20;
      reasons.push(
        `Experience: ${candidateYears} years (${gap} years below minimum, -20 penalty)`
      );
    }
  } else if (candidateYears === 0 && minExp > 0) {
    // No experience when experience required
    if (minExp === 1) {
      // Only 1 year required - moderate penalty (can be trained)
      experienceScore = 8;
      experiencePenalty = 15;
      reasons.push(
        `Fresher (role requires ${minExp} year, -15 penalty - trainable)`
      );
    } else if (minExp === 2) {
      // 2 years required - larger penalty
      experienceScore = 5;
      experiencePenalty = 20;
      reasons.push(`Fresher (role requires ${minExp} years, -20 penalty)`);
    } else {
      // 3+ years required - maximum penalty
      experienceScore = 3;
      experiencePenalty = 25;
      reasons.push(
        `Fresher (role requires ${minExp}+ years, -25 penalty - significant gap)`
      );
    }
  }

  return { experienceScore, experiencePenalty };
}

// ==================== AI-FIRST JOB DETECTION ====================

/**
 * ✅ AI-FIRST job category detection
 */
async function detectJobCategory(
  jobDescription,
  jobTitle,
  requiredSkills = []
) {
  console.log(`🎯 Detecting job category for: ${jobTitle}`);

  // ✅ PRIORITY 1: Try AI detection FIRST
  if (geminiService && geminiService.detectJobDomain) {
    try {
      console.log("🤖 Using AI for job detection...");
      const aiResult = await geminiService.detectJobDomain(
        jobTitle,
        jobDescription,
        requiredSkills
      );

      if (aiResult.confidence > 0.6) {
        console.log(
          `✅ AI Detection: ${aiResult.domain} (${Math.round(
            aiResult.confidence * 100
          )}% confident)`
        );
        console.log(`   Reasoning: ${aiResult.reasoning}`);

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

        return domainMap[aiResult.domain] || "general";
      } else {
        console.log(
          `⚠️ AI confidence too low (${Math.round(
            aiResult.confidence * 100
          )}%), trying keywords...`
        );
      }
    } catch (error) {
      console.error("❌ AI detection error:", error.message);
      console.log("⚠️ Falling back to keyword matching");
    }
  } else {
    console.log("⚠️ AI not available, using keyword matching");
  }

  // ✅ FALLBACK: Keyword-based detection
  console.log("🔍 Using keyword-based detection as fallback...");
  const text = (jobDescription + " " + jobTitle).toLowerCase();
  let maxScore = 0;
  let bestMatch = "general";

  Object.entries(JOB_DOMAINS).forEach(([category, config]) => {
    let score = 0;
    config.primaryKeywords.forEach((keyword) => {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  });

  if (maxScore >= 2) {
    console.log(`🔍 Keyword Detection: ${bestMatch} (score: ${maxScore})`);
    return bestMatch;
  }

  console.log(`⚠️ No strong keyword match, defaulting to 'general'`);
  return "general";
}

// ==================== DOMAIN-SPECIFIC SCORING FUNCTIONS (WITH EXPERIENCE PENALTIES) ====================

function calculateNetworkEngineerScore(resume, job, jobTitle) {
  console.log(`🌐 Network Engineer scoring for ${resume.candidateName}`);

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
            (resumeText.includes("cisco meraki") ||
              resumeText.includes("meraki"))
          )
            return true;
          if (
            skill === "thousandeyes" &&
            (resumeText.includes("thousandeyes") ||
              resumeText.includes("thousand eyes"))
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

    const categoryScore =
      (categoryMatches.length / config.skills.length) * config.weight;
    skillScore += categoryScore;
    totalMatched += categoryMatches.length;
    totalPossible += config.skills.length;

    if (categoryMatches.length > 0) {
      reasons.push(
        `${category}: ${categoryMatches.join(", ")} (${
          categoryMatches.length
        }/${config.skills.length})`
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

  if (
    resumeText.includes("cisco meraki") &&
    resumeText.includes("thousandeyes")
  ) {
    skillScore += 15;
    reasons.push("Exact tool match: Cisco Meraki + ThousandEyes (+15 bonus)");
  }

  // ✅ UPDATED: Use universal experience scoring
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
    "tally",
    "accounting",
    "finance",
    "excel",
    "office",
    "bookkeeping",
    "taxation",
    "digital marketing",
    "marketing",
  ];
  const hasNonTechSkills = resumeSkills.some((skill) =>
    nonTechSkills.some((nonTech) => skill.includes(nonTech))
  );

  let domainPenalty = 0;
  if (hasNonTechSkills && skillScore < 30) {
    domainPenalty = 40;
    reasons.push(
      `Major domain mismatch: Non-technical background for network engineering (-40 penalty)`
    );
  }

  // ✅ UPDATED: Include experiencePenalty
  const totalScore = Math.min(
    100,
    skillScore +
      experienceScore +
      educationResult.score -
      domainPenalty -
      experiencePenalty
  );
  const finalScore = Math.round(Math.max(5, totalScore));

  console.log(
    `📊 ${resume.candidateName} Network Engineer score: ${finalScore}%`
  );

  return {
    score: finalScore,
    matchScore: finalScore,
    skillsMatch: {
      matched: resumeSkills.filter((skill) =>
        Object.values(networkSkills).some((category) =>
          category.skills.some(
            (reqSkill) =>
              skill.includes(reqSkill.replace(/[^a-z]/g, "")) ||
              reqSkill.includes(skill)
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
  console.log(`💰 Finance Intern scoring for ${resume.candidateName}`);

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
            resumeSkill.includes(skill.replace(/[^a-z]/g, "")) ||
            skill.includes(resumeSkill)
        ) || resumeText.includes(skill)
    );

    const categoryScore =
      (categoryMatches.length / config.skills.length) * config.weight;
    skillScore += categoryScore;

    if (categoryMatches.length > 0) {
      reasons.push(
        `${category}: ${categoryMatches.join(", ")} (${
          categoryMatches.length
        }/${config.skills.length})`
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

  // ✅ UPDATED: Use universal experience scoring
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
    "javascript",
    "python",
    "java",
    "react",
    "node.js",
    "programming",
    "developer",
    "software",
    "coding",
  ];
  const hasTechSkills = resumeSkills.some((skill) =>
    techSkills.some((tech) => skill.includes(tech))
  );

  let techPenalty = 0;
  if (hasTechSkills && skillScore < 40) {
    techPenalty = 30;
    reasons.push(
      "Strong technical background - likely not suitable for finance role (-30 penalty)"
    );
  }

  // ✅ UPDATED: Include experiencePenalty
  const totalScore = Math.min(
    100,
    skillScore +
      experienceScore +
      educationResult.score -
      techPenalty -
      experiencePenalty
  );
  const finalScore = Math.round(Math.max(5, totalScore));

  console.log(
    `📊 ${resume.candidateName} Finance Intern score: ${finalScore}%`
  );

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

  console.log(`🎯 Full Stack scoring for ${resume.candidateName}`);

  const fullStackSkills = {
    frontend: {
      weight: 25,
      skills: [
        "javascript",
        "js",
        "html",
        "css",
        "react",
        "angular",
        "vue",
        "bootstrap",
        "jquery",
      ],
    },
    backend: {
      weight: 25,
      skills: [
        "node.js",
        "express.js",
        "express",
        "python",
        "java",
        "php",
        "django",
        "spring",
        "fastapi",
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
        "redis",
        "sqlite",
      ],
    },
    tools: {
      weight: 15,
      skills: [
        "git",
        "github",
        "aws",
        "docker",
        "postman",
        "rest",
        "api",
        "gitlab",
        "npm",
        "yarn",
      ],
    },
    concepts: {
      weight: 15,
      skills: [
        "restful",
        "mvc",
        "microservices",
        "oop",
        "data structures",
        "algorithms",
        "json",
        "ajax",
      ],
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
          (skill === "javascript" &&
            (resumeSkill.includes("js") || resumeSkill.includes("node"))) ||
          (skill === "express.js" && resumeSkill.includes("express")) ||
          (skill === "mongodb" && resumeSkill.includes("mongo"))
        );
      })
    );

    const categoryScore =
      (categoryMatches.length / config.skills.length) * config.weight;
    skillScore += categoryScore;
    totalMatched += categoryMatches.length;
    totalRequired += config.skills.length;

    if (categoryMatches.length > 0) {
      reasons.push(
        `${category}: ${categoryMatches.join(", ")} (${
          categoryMatches.length
        }/${config.skills.length})`
      );
    }
  });

  const projectKeywords = [
    "full.?stack",
    "web.?app",
    "restful",
    "api",
    "frontend",
    "backend",
    "mern",
    "mean",
  ];
  const extractedText = (resume.extractedText || "").toLowerCase();
  const projectMatches = projectKeywords.filter((keyword) =>
    new RegExp(keyword).test(extractedText)
  );

  const projectBonus = projectMatches.length * 4;
  skillScore = Math.min(70, skillScore + projectBonus);

  if (projectMatches.length > 0) {
    reasons.push(
      `Project experience: ${projectMatches.join(
        ", "
      )} (+${projectBonus} bonus)`
    );
  }

  // ✅ UPDATED: Use universal experience scoring
  const experienceYears = resume.experience?.years || 0;
  const { experienceScore, experiencePenalty } = calculateExperienceScore(
    experienceYears,
    minExp || 0,
    maxExp || 10,
    reasons
  );

  let educationScore = 0;
  const education = (
    resume.education?.degree ||
    resume.education ||
    ""
  ).toLowerCase();

  if (/mca|computer|engineering|technology|bca/.test(education)) {
    educationScore = 10;
    reasons.push(
      `Technical education: ${resume.education?.degree || education}`
    );
  } else if (/bachelor|degree/.test(education)) {
    educationScore = 6;
    reasons.push(`General degree: ${resume.education?.degree || education}`);
  } else {
    educationScore = 2;
    reasons.push(`Education not specified or non-technical`);
  }

  const nonTechSkills = [
    "tally",
    "accounting",
    "finance",
    "excel",
    "office",
    "bookkeeping",
    "taxation",
    "digital marketing",
  ];
  const hasNonTechSkills = resumeSkillsLower.some((skill) =>
    nonTechSkills.some((nonTech) => skill.includes(nonTech))
  );

  let domainPenalty = 0;
  if (hasNonTechSkills && skillScore < 25) {
    domainPenalty = 35;
    reasons.push(
      `Major domain mismatch: Non-technical background for development role (-35 penalty)`
    );
  }

  // ✅ UPDATED: Include experiencePenalty
  const totalScore =
    skillScore +
    experienceScore +
    educationScore -
    domainPenalty -
    experiencePenalty;
  const finalScore = Math.round(Math.min(100, Math.max(5, totalScore)));

  console.log(`📊 ${resume.candidateName} Full Stack score: ${finalScore}%`);

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
        (req) =>
          !resumeSkillsLower.some((skill) => skill.includes(req.toLowerCase()))
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
  console.log(`💻 Software Developer scoring for ${resume.candidateName}`);

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

/**
 * ✅ AI-powered scoring for jobs that don't fit predefined categories
 */
async function calculateAIBasedScore(resume, job, jobTitle, jobCategory) {
  console.log(`🤖 AI-based scoring for ${resume.candidateName} - ${jobTitle}`);

  if (!geminiService || !geminiService.calculateSemanticMatchDetailed) {
    console.log("⚠️ AI not available for semantic matching");
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

    console.log(`✅ AI Score: ${aiResult.score}% - ${aiResult.recommendation}`);

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
    console.error("❌ AI scoring failed:", error.message);
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
    console.log(`❌ Invalid resume data`);
    return {
      matchScore: 0,
      skillsMatch: { matched: [], missing: requiredSkills, percentage: 0 },
      experienceMatch: false,
      educationMatch: false,
      reasons: ["Invalid candidate data"],
      jobCategory: "invalid",
    };
  }

  console.log(`\n🎯 AI-FIRST Scoring: ${resume.candidateName} for ${jobTitle}`);

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
      console.log("🤖 Category is 'general' - using AI semantic scoring");
      result = await calculateAIBasedScore(
        resume,
        jobData,
        jobTitle,
        jobCategory
      );
    } else {
      console.log(`📋 Using rule-based scoring for: ${jobCategory}`);
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
          result = await calculateAIBasedScore(
            resume,
            jobData,
            jobTitle,
            jobCategory
          );
      }
    }

    // AI enhancement for borderline scores
    if (
      geminiService &&
      result.score >= 40 &&
      result.score <= 70 &&
      !result.aiEnhanced
    ) {
      try {
        console.log(`🤖 Applying AI enhancement for borderline score...`);
        const aiReasons = await geminiService.generateMatchReasons(
          resume,
          jobDescription,
          result.score
        );

        if (aiReasons && aiReasons.length > 0) {
          result.reasons = [...result.reasons.slice(0, 3), ...aiReasons];
          console.log(`✅ AI provided ${aiReasons.length} additional insights`);
        }
      } catch (aiError) {
        console.log("⚠️ AI enhancement failed");
      }
    }

    console.log(`✅ Final Score: ${result.score}%\n`);

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
    console.error(`❌ Scoring failed for ${resume.candidateName}:`, error);
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
  if (
    !resume ||
    !Array.isArray(jobDescriptions) ||
    jobDescriptions.length === 0
  ) {
    throw new Error("Invalid parameters for multi-JD scoring");
  }

  const results = {};
  console.log(
    `\n🎯 Multi-JD AI-FIRST scoring for ${resume.candidateName} against ${jobDescriptions.length} jobs`
  );

  for (const jd of jobDescriptions) {
    try {
      console.log(`\n  📋 Scoring against: ${jd.jobTitle}`);

      const singleResult = await scoreCandidate(resume, {
        requiredSkills: jd.requiredSkills || [],
        minExp: jd.minExp || 0,
        maxExp: jd.maxExp || 50,
        educationLevel: jd.educationLevel || "",
        jobTitle: jd.jobTitle,
        jobDescription: jd.jobDescription,
      });

      results[jd.jobTitle] = {
        ...singleResult,
        jobTitle: jd.jobTitle,
      };

      console.log(`  ✅ ${jd.jobTitle}: ${singleResult.matchScore}%`);
    } catch (jobError) {
      console.error(
        `❌ Failed to score ${resume.candidateName} for ${jd.jobTitle}:`,
        jobError.message
      );

      results[jd.jobTitle] = {
        score: 5,
        matchScore: 5,
        skillsMatch: {
          matched: [],
          missing: jd.requiredSkills || [],
          percentage: 0,
        },
        experienceMatch: false,
        educationMatch: false,
        reasons: [`Error scoring for ${jd.jobTitle}: ${jobError.message}`],
        jobCategory: "error",
        jobTitle: jd.jobTitle,
      };
    }
  }

  console.log(`\n✅ Multi-JD scoring completed for ${resume.candidateName}\n`);
  return results;
}

// ==================== UTILITY FUNCTIONS ====================

function strictSkillMatch(resumeSkills = [], requiredSkills = []) {
  if (!Array.isArray(resumeSkills) || !Array.isArray(requiredSkills)) {
    return { matched: [], missing: [], percentage: 0 };
  }

  const resumeSkillsLower = resumeSkills.map((s) =>
    String(s).toLowerCase().trim()
  );
  const requiredSkillsLower = requiredSkills.map((s) =>
    String(s).toLowerCase().trim()
  );

  const matched = requiredSkills.filter((reqSkill) => {
    const reqLower = reqSkill.toLowerCase().trim();
    return resumeSkillsLower.some(
      (resSkill) =>
        resSkill === reqLower ||
        resSkill.includes(reqLower) ||
        reqLower.includes(resSkill)
    );
  });

  const missing = requiredSkills.filter((reqSkill) => {
    const reqLower = reqSkill.toLowerCase().trim();
    return !resumeSkillsLower.some(
      (resSkill) =>
        resSkill === reqLower ||
        resSkill.includes(reqLower) ||
        reqLower.includes(resSkill)
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

function validateSkillsRelevance(
  resumeSkills = [],
  jobCategory = "general",
  jobTitle = ""
) {
  if (!Array.isArray(resumeSkills) || resumeSkills.length === 0) {
    return { isRelevant: true, penalty: 0, reason: "No skills to validate" };
  }

  const resumeSkillsLower = resumeSkills.map((s) =>
    String(s).toLowerCase().trim()
  );
  const jobLower = `${jobCategory} ${jobTitle}`.toLowerCase();

  const irrelevantPatterns = {
    finance: [
      "javascript",
      "python",
      "java",
      "react",
      "node",
      "programming",
      "developer",
      "software",
      "coding",
      "html",
      "css",
      "angular",
      "vue",
    ],
    accounting: [
      "javascript",
      "python",
      "java",
      "react",
      "node",
      "programming",
      "developer",
      "software",
      "coding",
    ],
    technical: [
      "tally",
      "accounting",
      "finance",
      "bookkeeping",
      "taxation",
      "audit",
      "gst",
    ],
    development: ["tally", "accounting", "finance", "bookkeeping", "taxation"],
  };

  if (
    jobLower.includes("finance") ||
    jobLower.includes("accounting") ||
    jobLower.includes("audit")
  ) {
    const hasTechnicalSkills = resumeSkillsLower.some((skill) =>
      irrelevantPatterns.finance.some((pattern) => skill.includes(pattern))
    );

    if (hasTechnicalSkills) {
      return {
        isRelevant: false,
        penalty: 0.3,
        reason: "Technical skills not relevant for finance role",
      };
    }
  }

  if (
    jobLower.includes("developer") ||
    jobLower.includes("engineer") ||
    jobLower.includes("software")
  ) {
    const hasFinanceSkills = resumeSkillsLower.some((skill) =>
      irrelevantPatterns.technical.some((pattern) => skill.includes(pattern))
    );

    if (hasFinanceSkills) {
      return {
        isRelevant: false,
        penalty: 0.3,
        reason: "Finance skills not relevant for technical role",
      };
    }
  }

  return { isRelevant: true, penalty: 0, reason: "Skills are relevant" };
}

function calculateMatchScore(resume, job) {
  if (!resume || !job) return 0;

  const skillMatch = calculateSkillMatch(
    resume.skills || [],
    job.requiredSkills || []
  );
  const experienceMatch =
    (resume.experience?.years || 0) >= (job.minExp || 0) ? 20 : 10;
  const educationMatch = resume.education?.degree ? 10 : 0;

  return Math.min(
    100,
    Math.round(skillMatch * 0.7 + experienceMatch + educationMatch)
  );
}

function validateEducation(education = "", jobCategory = "general") {
  if (!education) {
    return { suitable: true, penalty: 0, reason: "No education specified" };
  }

  const eduLower = education.toLowerCase();
  const relevance =
    EDUCATION_RELEVANCE[jobCategory] || EDUCATION_RELEVANCE.software_developer;

  if (relevance.highly_relevant.some((edu) => eduLower.includes(edu))) {
    return { suitable: true, penalty: 0, reason: "Highly relevant education" };
  }

  if (relevance.somewhat_relevant.some((edu) => eduLower.includes(edu))) {
    return {
      suitable: true,
      penalty: 0.1,
      reason: "Somewhat relevant education",
    };
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

  // Domain-specific scoring
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
    calculateExperienceScore, // ✅ Export the new function
  },
};
