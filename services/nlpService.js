/**
 * @fileoverview AI-ENHANCED NLP Service - Resume Text Processing with Gemini
 * @version 5.0.0 - HYBRID: Rule-based + AI Enhancement
 */

const natural = require("natural");

// ==================== GEMINI AI INTEGRATION ====================
let geminiService = null;
const USE_AI = process.env.USE_AI_ENHANCEMENT === "true";

// Try to load Gemini service (graceful fallback if not available)
if (USE_AI) {
  try {
    geminiService = require("./geminiService");
    console.log("✅ Gemini AI service loaded successfully");
  } catch (error) {
    console.log("⚠️ Gemini AI not available, using rule-based only");
  }
}

// Enhanced skills database
const COMMON_SKILLS = [
  "javascript",
  "js",
  "python",
  "java",
  "react",
  "node.js",
  "nodejs",
  "html",
  "css",
  "sql",
  "mongodb",
  "mysql",
  "postgresql",
  "git",
  "github",
  "docker",
  "aws",
  "azure",
  "gcp",
  "angular",
  "vue",
  "express.js",
  "express",
  "bootstrap",
  "jquery",
  "php",
  "c++",
  "c#",
  "ruby",
  "go",
  "golang",
  "swift",
  "kotlin",
  "flutter",
  "dart",
  "redis",
  "elasticsearch",
  "kubernetes",
  "jenkins",
  "linux",
  "ubuntu",
  "windows",
  "macos",
  "android",
  "ios",
  "photoshop",
  "illustrator",
  "figma",
  "sketch",
  "excel",
  "word",
  "powerpoint",
  "office",
  "tableau",
  "power bi",
  "powerbi",
  "salesforce",
  "jira",
  "confluence",
  "slack",
  "teams",
  "rest api",
  "restful",
  "graphql",
  "microservices",
  "agile",
  "scrum",
  "devops",
  "ci/cd",
  "machine learning",
  "ml",
  "deep learning",
  "tensorflow",
  "pytorch",
  "pandas",
  "numpy",
  "scikit-learn",
  "opencv",
  "nlp",
  "data science",
  "analytics",
  "big data",
  "spark",
  "django",
  "flask",
  "spring",
  "laravel",
  "codeigniter",
  "wordpress",
  "drupal",
  "typescript",
  "sass",
  "less",
  "webpack",
  "babel",
  "npm",
  "yarn",
  "gulp",
  "grunt",
];

// ✅ FIXED: Simple and effective name extraction
function extractName(text) {
  console.log("🔍 FIXED: Starting name extraction...");

  if (!text || typeof text !== "string") {
    console.log("❌ No valid text for name extraction");
    return "Unknown Candidate";
  }

  // Clean and split text into lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  console.log(`📝 Processing ${lines.length} lines for name extraction`);

  // Skip keywords that are not names
  const skipKeywords = [
    "resume",
    "cv",
    "curriculum",
    "objective",
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "contact",
    "address",
    "phone",
    "email",
    "name:",
    "vitae",
  ];

  // Check first 10 lines for a name
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();

    // Skip lines that are clearly not names
    if (
      line.includes("@") ||
      /\d{3,}/.test(line) ||
      line.length > 50 ||
      line.length < 2 ||
      skipKeywords.some(
        (keyword) =>
          line.toLowerCase() === keyword ||
          line.toLowerCase().startsWith(keyword)
      )
    ) {
      continue;
    }

    // Check if line looks like a name
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    if (words.length >= 1 && words.length <= 4) {
      // Check if all words are alphabetic (allowing dots for initials)
      if (words.every((word) => /^[A-Za-z][A-Za-z.]*$/.test(word))) {
        console.log(`✅ FOUND NAME: "${line}"`);
        return line;
      }
    }
  }

  console.log("❌ No name found, using default");
  return "Unknown Candidate";
}

// ✅ FIXED: Simplified email extraction
function extractEmail(text) {
  console.log("🔍 FIXED: Starting email extraction...");

  if (!text) {
    console.log("❌ No text provided for email extraction");
    return null;
  }

  // Simple but effective email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = text.match(emailRegex);

  if (matches && matches.length > 0) {
    const email = matches[0].toLowerCase();
    console.log(`✅ FOUND EMAIL: ${email}`);
    return email;
  }

  console.log("❌ No email found");
  return null;
}

// ✅ FIXED: Enhanced phone extraction (handles spaces and dashes)
function extractPhone(text) {
  console.log("🔍 FIXED: Starting phone extraction...");

  if (!text) {
    console.log("❌ No text provided for phone extraction");
    return null;
  }

  // First, remove common formatting to normalize
  const normalizedText = text.replace(/[\s\-()]/g, ""); // Remove spaces, dashes, parentheses

  // Indian phone number patterns (now matching normalized text)
  const phonePatterns = [
    /\+91[6-9]\d{9}/g, // +919876543210
    /91[6-9]\d{9}/g, // 919876543210
    /\b[6-9]\d{9}\b/g, // 9876543210
  ];

  for (const pattern of phonePatterns) {
    const matches = normalizedText.match(pattern);
    if (matches && matches.length > 0) {
      let phone = matches[0].replace(/\D/g, ""); // Remove non-digits

      // Remove country code if present
      if (phone.length === 12 && phone.startsWith("91")) {
        phone = phone.substring(2);
      } else if (phone.length === 11 && phone.startsWith("91")) {
        phone = phone.substring(2);
      }

      // Validate 10-digit Indian phone number
      if (phone.length === 10 && phone.match(/^[6-9]/)) {
        console.log(`✅ FOUND PHONE: ${phone}`);
        return phone;
      }
    }
  }

  console.log("❌ No phone found");
  return null;
}

// ✅ AI-ENHANCED: Skills extraction with Gemini fallback
async function extractSkills(text) {
  console.log("🔍 AI-ENHANCED: Starting skills extraction...");

  if (!text || typeof text !== "string") {
    console.log("❌ No valid text for skills extraction");
    return [];
  }

  const textLower = text.toLowerCase();
  const extractedSkills = new Set();

  // Method 1: Direct skill matching against common skills
  console.log("📋 Method 1: Checking common skills...");
  for (const skill of COMMON_SKILLS) {
    const skillPattern = new RegExp(
      `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    if (skillPattern.test(textLower)) {
      extractedSkills.add(skill.toLowerCase());
    }
  }

  // Method 2: Look for skills in dedicated sections
  console.log("📋 Method 2: Checking skills sections...");
  const skillsSectionRegex =
    /(?:skills|technologies|technical\s+skills|programming|tools)[:\-\s]+(.*?)(?:\n\s*(?:experience|education|projects|objective|summary|work|employment|career)|$)/is;
  const skillsMatch = text.match(skillsSectionRegex);

  if (skillsMatch && skillsMatch[1]) {
    const skillsText = skillsMatch[1];
    const skillsList = skillsText
      .replace(/[,;|\n]/g, " ")
      .split(" ")
      .map((skill) => skill.trim().toLowerCase())
      .filter((skill) => skill.length > 2 && skill.length < 20)
      .filter((skill) => !/^\d+$/.test(skill));

    skillsList.forEach((skill) => {
      if (
        COMMON_SKILLS.some(
          (commonSkill) =>
            commonSkill.toLowerCase() === skill ||
            commonSkill.toLowerCase().includes(skill) ||
            skill.includes(commonSkill.toLowerCase())
        )
      ) {
        extractedSkills.add(skill);
      }
    });
  }

  // Method 3: AI Enhancement (if available)
  if (geminiService && extractedSkills.size < 5) {
    try {
      console.log("🤖 Method 3: Using AI to find more skills...");
      const aiSkills = await geminiService.extractSkills(text);
      if (aiSkills && aiSkills.length > 0) {
        aiSkills.forEach((skill) => extractedSkills.add(skill.toLowerCase()));
        console.log(`✅ AI found ${aiSkills.length} additional skills`);
      }
    } catch (error) {
      console.log("⚠️ AI skills extraction failed, using rule-based only");
    }
  }

  const finalSkills = Array.from(extractedSkills).slice(0, 25);
  console.log(`✅ FOUND ${finalSkills.length} SKILLS:`, finalSkills);

  return finalSkills;
}

// ✅ FIXED: Enhanced experience extraction (better pattern matching)
function extractExperience(text) {
  console.log("🔍 FIXED: Starting experience extraction...");

  if (!text) {
    console.log("❌ No text for experience extraction");
    return { years: 0, positions: [], companies: [] };
  }

  let years = 0;
  const positions = [];

  // Enhanced patterns to catch more experience formats
  const expPatterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/gi,
    /(?:experience|exp)[\s:]*(\d+)\+?\s*(?:years?|yrs?)/gi,
    /(\d+)\s*(?:years?|yrs?)\s+(?:in|as|of)/gi,
    /(?:at|with)\s+\w+\s*\((\d+)\s*(?:years?|yrs?)\)/gi,
  ];

  for (const pattern of expPatterns) {
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const extractedYears = parseInt(match[1]) || 0;
      if (extractedYears > years && extractedYears <= 50) {
        years = extractedYears;
        console.log(`  📌 Found experience: ${extractedYears} years`);
      }
    }
  }

  // Check for fresher/intern keywords
  const textLower = text.toLowerCase();
  if (textLower.includes("fresher") || textLower.includes("fresh graduate")) {
    if (years === 0) {
      positions.push("Fresher");
    }
  }

  if (textLower.includes("intern") || textLower.includes("internship")) {
    if (years === 0) years = 0;
    positions.push("Intern");
  }

  console.log(`✅ FOUND EXPERIENCE: ${years} years`);
  return { years: Math.min(years, 50), positions, companies: [] };
}

// ✅ FIXED: Simple education extraction
function extractEducation(text) {
  console.log("🔍 FIXED: Starting education extraction...");

  if (!text) {
    console.log("❌ No text for education extraction");
    return "Not Specified";
  }

  const textLower = text.toLowerCase();

  const educationPatterns = [
    { pattern: /phd|ph\.d|doctorate/i, level: "PhD" },
    { pattern: /master|m\.tech|m\.sc|mca|mba|m\.com/i, level: "Master's" },
    {
      pattern: /bachelor|b\.tech|b\.sc|bca|b\.com|be\s|b\.e/i,
      level: "Bachelor's",
    },
    { pattern: /diploma/i, level: "Diploma" },
    { pattern: /12th|higher\s+secondary|\+2/i, level: "12th" },
    { pattern: /10th|secondary|sslc/i, level: "10th" },
  ];

  for (const { pattern, level } of educationPatterns) {
    if (pattern.test(textLower)) {
      console.log(`✅ FOUND EDUCATION: ${level}`);
      return level;
    }
  }

  console.log("❌ No education level found");
  return "Not Specified";
}

// ✅ AI-ENHANCED: Main processing function with AI boost
async function processResumeText(text) {
  if (!text || !text.trim()) {
    throw new Error("Empty or invalid text provided");
  }

  console.log("🔄 AI-ENHANCED: Starting resume processing...");
  console.log(`📊 Text length: ${text.length} characters`);
  console.log(`🤖 AI Mode: ${geminiService ? "ENABLED" : "DISABLED"}`);

  const startTime = Date.now();

  try {
    // Extract with rule-based methods first
    const parsed = {
      name: extractName(text),
      email: extractEmail(text),
      phone: extractPhone(text),
      skills: await extractSkills(text), // Now async with AI
      experience: extractExperience(text),
      education: extractEducation(text),
      processingTime: 0,
      confidence: 0,
      aiEnhanced: false, // Track if AI was used
    };

    // AI Enhancement Layer (if available and data is incomplete)
    if (geminiService) {
      try {
        const needsAI =
          !parsed.email || !parsed.phone || parsed.skills.length < 3;

        if (needsAI) {
          console.log("🤖 Applying AI enhancement...");
          const aiEnhancements = await geminiService.enhanceResumeParsing(
            text,
            parsed
          );

          if (aiEnhancements) {
            // Merge AI results with rule-based results
            parsed.email = parsed.email || aiEnhancements.email;
            parsed.phone = parsed.phone || aiEnhancements.phone;
            parsed.skills = [
              ...new Set([...parsed.skills, ...(aiEnhancements.skills || [])]),
            ].slice(0, 25);
            parsed.aiEnhanced = true;
            console.log("✅ AI enhancement applied successfully");
          }
        }
      } catch (aiError) {
        console.log("⚠️ AI enhancement failed, using rule-based results only");
      }
    }

    const processingTime = Date.now() - startTime;
    parsed.processingTime = processingTime;

    // Calculate confidence based on extracted data
    let confidence = 20;
    if (parsed.name && parsed.name !== "Unknown Candidate") confidence += 30;
    if (parsed.email) confidence += 25;
    if (parsed.phone) confidence += 15;
    if (parsed.skills && parsed.skills.length > 0) confidence += 25;
    if (parsed.experience && parsed.experience.years >= 0) confidence += 5;

    parsed.confidence = Math.min(100, confidence);

    console.log(`✅ Processing completed in ${processingTime}ms`);
    console.log(`📊 FINAL RESULT:`, {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      skillsCount: parsed.skills?.length || 0,
      skills: parsed.skills?.slice(0, 5) || [],
      experience: parsed.experience?.years || 0,
      education: parsed.education,
      confidence: parsed.confidence,
      aiEnhanced: parsed.aiEnhanced,
    });

    return parsed;
  } catch (error) {
    console.error("❌ Error in resume processing:", error);
    throw error;
  }
}

module.exports = {
  processResumeText,
  _private: {
    extractEmail,
    extractPhone,
    extractSkills,
    extractExperience,
    extractEducation,
    extractName,
  },
};
