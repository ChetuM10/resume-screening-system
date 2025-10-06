/**
 * @fileoverview AI-ENHANCED NLP Service - Resume Text Processing with Gemini
 * @version 5.1.0 - HYBRID: Rule-based + AI Enhancement + SMART NAME DETECTION
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

// ✅ EXPANDED: Helper function to detect job titles, skills, and technical terms
function looksLikeJobTitleOrSkill(text) {
  const jobTitleKeywords = [
    // Job titles
    "developer",
    "engineer",
    "manager",
    "analyst",
    "designer",
    "consultant",
    "specialist",
    "coordinator",
    "assistant",
    "director",
    "officer",
    "executive",
    "administrator",
    "supervisor",
    "lead",
    "head",
    "chief",
    "president",

    // Job modifiers
    "senior",
    "junior",
    "associate",
    "intern",
    "trainee",
    "full",
    "stack",
    "front",
    "backend",
    "mobile",

    // Skills/Technologies (common ones that appear in resumes)
    "digital",
    "marketing",
    "sales",
    "business",
    "data",
    "web",
    "software",
    "cloud",
    "devops",
    "android",
    "ios",
    "java",
    "python",
    "javascript",
    "react",

    // Departments/Areas
    "human",
    "resources",
    "finance",
    "accounting",
    "operations",
    "customer",
    "service",
    "support",
    "quality",
    "assurance",
    "product",
    "project",
    "program",
    "technical",
    "content",

    // ✅ NEW: ML/AI/Tech terms that appear in project descriptions
    "classifier",
    "model",
    "algorithm",
    "learning",
    "prediction",
    "detection",
    "recognition",
    "analysis",
    "system",
    "platform",
    "application",
    "framework",
    "architecture",
    "deployment",
    "optimization",
    "processing",
    "mining",
    "clustering",
    "regression",
    "neural",
    "network",
    "deep",
    "supervised",
    "unsupervised",
    "reinforcement",
    "training",
    "testing",
  ];

  const textLower = text.toLowerCase();
  return jobTitleKeywords.some((keyword) => textLower.includes(keyword));
}

// ✅ ULTIMATE: Name extraction with 4 strategies + DEBUG mode + FALLBACK
function extractName(text) {
  console.log("🔍 ULTIMATE: Starting name extraction...");

  if (!text || typeof text !== "string") {
    console.log("❌ No valid text for name extraction");
    return "Unknown Candidate";
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  console.log(`📝 Processing ${lines.length} lines for name extraction`);

  // ✅ EXPANDED DEBUG: Show lines 0-20 to find the name
  console.log("🐛 EXPANDED DEBUG: Lines 0-20:");
  for (let i = 0; i < Math.min(lines.length, 21); i++) {
    console.log(`  Line ${i}: "${lines[i]}"`);
  }

  // EXPANDED skip keywords
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
    "professional",
    "personal",
    "technical",
    "career",
    "work",
    "employment",
    "qualification",
    "cgpa",
    "gpa",
    "percentage",
    "marks",
    "score",
    "seeking",
    "position",
    "reputed",
    "organisation",
    "organization",
    "company",
    "challenging",
    "ms",
    "office",
    "tally",
    "erp",
    "power",
    "bi",
    "tableau",
    "soft",
    "hard",
    "dancing",
    "swimming",
    "cooking",
    "english",
    "kannada",
    "hindi",
    "communication",
    "team",
    "problem",
    "solving",
    "ability",
    "leadership",
    "tools",
    "technologies",
    "programming",
    "interests",
    "hobbies",
    "languages",
    "language",
    "reading",
    "books",
    "photography",
    "application",
    "software",
    "version",
    "control",
    "database",
    "management",
    "front-end",
    "back-end",
    "frontend",
    "backend",
  ];

  // ========== STRATEGY 1: Check first 10 lines ==========
  console.log("🔍 Strategy 1: Looking for name in first 10 lines...");

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();

    // Skip if contains @ or 6+ digits
    if (line.includes("@") || /\d{6,}/.test(line)) {
      console.log(`⏭️ Skipping line ${i}: "${line}" (email/phone)`);
      continue;
    }

    // Skip if too long or too short
    if (line.length > 50 || line.length < 2) {
      console.log(`⏭️ Skipping line ${i}: too long/short`);
      continue;
    }

    // Skip if contains keywords
    const lowercaseLine = line.toLowerCase();
    if (skipKeywords.some((keyword) => lowercaseLine.includes(keyword))) {
      console.log(`⏭️ Skipping line ${i}: "${line}" (keyword)`);
      continue;
    }

    // ✅ Skip if it looks like a job title or skill
    if (looksLikeJobTitleOrSkill(line)) {
      console.log(`⏭️ Skipping line ${i}: "${line}" (job title/skill)`);
      continue;
    }

    // Check if it's a valid name (1-4 words, alphabetic)
    const words = line.split(/\s+/).filter((w) => w.length > 0);

    if (words.length >= 1 && words.length <= 4) {
      // ✅ Allow single letter words (like "N") if part of a multi-word name
      const allAlphabetic = words.every((word) => {
        // If it's a single-word line, require at least 2 chars
        if (words.length === 1) {
          return (
            /^[A-Za-z]+$/.test(word) && word.length >= 2 && word.length <= 20
          );
        }
        // If it's a multi-word line, allow single letters (initials)
        return (
          /^[A-Za-z]+$/.test(word) && word.length >= 1 && word.length <= 20
        );
      });

      if (allAlphabetic) {
        console.log(`✅ FOUND NAME (First 10 lines): "${line}" at line ${i}`);
        return line;
      }
    }
  }

  // ========== STRATEGY 2: Look for ALL CAPS names in lines 10-40 ==========
  console.log("🔍 Strategy 2: Looking for ALL CAPS names...");

  for (let i = 10; i < Math.min(lines.length, 40); i++) {
    const line = lines[i].trim();

    // Skip if contains @ or 6+ digits
    if (line.includes("@") || /\d{6,}/.test(line)) {
      console.log(`  ⏭️ Line ${i}: "${line}" (email/phone)`);
      continue;
    }

    // Skip if too long or too short
    if (line.length > 50 || line.length < 2) {
      console.log(`  ⏭️ Line ${i}: too long/short`);
      continue;
    }

    // Skip if contains keywords
    const lowercaseLine = line.toLowerCase();
    if (skipKeywords.some((keyword) => lowercaseLine.includes(keyword))) {
      console.log(`  ⏭️ Line ${i}: "${line}" (keyword)`);
      continue;
    }

    // ✅ Skip if it looks like a job title or skill
    if (looksLikeJobTitleOrSkill(line)) {
      console.log(`  ⏭️ Line ${i}: "${line}" (job title/skill)`);
      continue;
    }

    const words = line.split(/\s+/).filter((w) => w.length > 0);

    if (words.length >= 1 && words.length <= 4) {
      // ✅ Allow single letter words in ALL CAPS names too
      const allCaps = words.every((word) => {
        if (words.length === 1) {
          return /^[A-Z]+$/.test(word) && word.length >= 2 && word.length <= 20;
        }
        return /^[A-Z]+$/.test(word) && word.length >= 1 && word.length <= 20;
      });

      if (allCaps) {
        console.log(`✅ FOUND NAME (ALL CAPS): "${line}" at line ${i}`);
        return line;
      } else {
        console.log(`  ⏭️ Line ${i}: "${line}" (not all caps)`);
      }
    }
  }

  // ========== STRATEGY 3: Look for Title Case names in lines 10-30 ==========
  console.log("🔍 Strategy 3: Looking for Title Case names...");

  for (let i = 10; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();

    // Skip if contains @ or 6+ digits
    if (line.includes("@") || /\d{6,}/.test(line)) {
      console.log(`  ⏭️ Line ${i}: "${line}" (email/phone)`);
      continue;
    }

    // Skip if too long or too short
    if (line.length > 50 || line.length < 2) {
      console.log(`  ⏭️ Line ${i}: too long/short`);
      continue;
    }

    // Skip if contains keywords
    const lowercaseLine = line.toLowerCase();
    if (skipKeywords.some((keyword) => lowercaseLine.includes(keyword))) {
      console.log(`  ⏭️ Line ${i}: "${line}" (keyword)`);
      continue;
    }

    // ✅ Skip if it looks like a job title or skill
    if (looksLikeJobTitleOrSkill(line)) {
      console.log(`  ⏭️ Line ${i}: "${line}" (job title/skill)`);
      continue;
    }

    const words = line.split(/\s+/).filter((w) => w.length > 0);

    if (words.length >= 1 && words.length <= 4) {
      // ✅ Check for Title Case OR Mixed Case (First letter caps)
      const isTitleCase = words.every((word) => {
        // Allow single letter words (initials) - must be uppercase
        if (word.length === 1) {
          return /^[A-Z]$/.test(word);
        }
        // Check if it's Title Case: First letter uppercase, rest can be lowercase OR all uppercase
        return (
          /^[A-Z]/.test(word) &&
          /^[A-Za-z]+$/.test(word) &&
          word.length >= 2 &&
          word.length <= 20
        );
      });

      if (isTitleCase) {
        console.log(`✅ FOUND NAME (Title Case): "${line}" at line ${i}`);
        return line;
      } else {
        console.log(`  ⏭️ Line ${i}: "${line}" (not title case)`);
      }
    } else {
      console.log(`  ⏭️ Line ${i}: "${line}" (word count: ${words.length})`);
    }
  }

  // ========== STRATEGY 4: FALLBACK - Search entire text for name patterns ==========
  console.log(
    "🔍 Strategy 4: FALLBACK - Searching entire text for name pattern..."
  );

  // Look for name patterns in the full text (not line-by-line)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]*){0,3})\b/g;
  let match;
  const potentialNames = [];

  while ((match = namePattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    const words = candidate.split(/\s+/);

    // Skip if it contains skip keywords
    const lowercaseCandidate = candidate.toLowerCase();
    if (skipKeywords.some((keyword) => lowercaseCandidate.includes(keyword))) {
      continue;
    }

    // Skip if it looks like a job title or skill
    if (looksLikeJobTitleOrSkill(candidate)) {
      continue;
    }

    // Skip if it's too short or too long
    if (candidate.length < 4 || candidate.length > 50) {
      continue;
    }

    // Must be 1-4 words, all alphabetic
    if (words.length >= 1 && words.length <= 4) {
      const allAlpha = words.every(
        (w) => /^[A-Za-z]+$/.test(w) && w.length >= 1 && w.length <= 20
      );
      if (allAlpha && !potentialNames.includes(candidate)) {
        potentialNames.push(candidate);
      }
    }
  }

  if (potentialNames.length > 0) {
    // Return the first potential name found
    console.log(`✅ FOUND NAME (Fallback): "${potentialNames[0]}"`);
    if (potentialNames.length > 1) {
      console.log(
        `   Other candidates: ${potentialNames.slice(1, 5).join(", ")}`
      );
    }
    return potentialNames[0];
  }

  console.log("❌ No name found in any strategy, using default");
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

// ✅ BULLETPROOF: Phone extraction that handles ALL formats
function extractPhone(text) {
  console.log("🔍 FIXED: Starting phone extraction...");

  if (!text) {
    console.log("❌ No text provided for phone extraction");
    return null;
  }

  // ========== METHOD 1: Direct 10-digit pattern (most common) ==========
  // Matches: 9876543210, (987) 654-3210, 987-654-3210, 987 654 3210
  const directPattern =
    /(?:\+91[\s\-]?)?(?:\()?([6-9]\d{2})(?:\))?[\s\-]?(\d{3})[\s\-]?(\d{4})/g;

  let match;
  while ((match = directPattern.exec(text)) !== null) {
    const phone = match[1] + match[2] + match[3];
    if (phone.length === 10) {
      console.log(`✅ FOUND PHONE (Method 1): ${phone}`);
      return phone;
    }
  }

  // ========== METHOD 2: Look for standalone 10-digit numbers ==========
  // Matches: 9876543210 (plain number)
  const standalonePattern = /\b([6-9]\d{9})\b/g;

  while ((match = standalonePattern.exec(text)) !== null) {
    const phone = match[1];
    console.log(`✅ FOUND PHONE (Method 2): ${phone}`);
    return phone;
  }

  // ========== METHOD 3: Normalize and search ==========
  console.log("🔄 Method 3: Trying normalized search...");
  const normalizedText = text.replace(/[\s\-()]/g, "");

  const normalizedPatterns = [
    /\+91([6-9]\d{9})/g, // +919876543210
    /\b91([6-9]\d{9})/g, // 919876543210
    /([6-9]\d{9})/g, // 9876543210
  ];

  for (const pattern of normalizedPatterns) {
    pattern.lastIndex = 0; // Reset regex
    while ((match = pattern.exec(normalizedText)) !== null) {
      const phone = match[1];
      if (phone.length === 10 && /^[6-9]/.test(phone)) {
        console.log(`✅ FOUND PHONE (Method 3): ${phone}`);
        return phone;
      }
    }
  }

  // ========== METHOD 4: Line-by-line search ==========
  console.log("🔄 Method 4: Trying line-by-line search...");
  const lines = text.split("\n");

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();

    // Check if line contains mostly digits (with optional formatting)
    const digitsOnly = line.replace(/\D/g, "");

    if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
      console.log(
        `✅ FOUND PHONE (Method 4): ${digitsOnly} from line ${i}: "${line}"`
      );
      return digitsOnly;
    }

    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      const phone = digitsOnly.substring(2);
      console.log(
        `✅ FOUND PHONE (Method 4): ${phone} from line ${i}: "${line}"`
      );
      return phone;
    }
  }

  console.log("❌ No phone found after all methods");
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
    looksLikeJobTitleOrSkill, // ✅ Export for testing
  },
};
