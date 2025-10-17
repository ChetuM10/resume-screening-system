/**
 * @fileoverview Gemini AI Service - Enhanced with Job Detection & Semantic Matching
 * @version 2.0.0 - AI-First Architecture Ready
 * @author Resume Screening System
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
const TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 2000;
const TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 30000;

// Initialize Gemini
let genAI = null;
let model = null;

if (API_KEY && API_KEY !== "your_gemini_api_key_here") {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`✅ Gemini AI initialized: ${MODEL_NAME}`);
  } catch (error) {
    console.error("❌ Failed to initialize Gemini AI:", error.message);
  }
} else {
  console.log("⚠️ Gemini API key not configured");
}

// ==================== EXISTING FUNCTIONS ====================

/**
 * Extract skills from resume text using AI
 */
async function extractSkills(resumeText) {
  if (!model) {
    console.log("⚠️ Gemini not available for skill extraction");
    return [];
  }

  try {
    const prompt = `Extract all technical skills from this resume. Return ONLY a JSON array of lowercase skill names, nothing else.

Resume:
${resumeText.substring(0, 3000)}

Example output: ["javascript", "react", "node.js", "mongodb"]`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
      ),
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const skills = JSON.parse(jsonMatch[0]);
      return Array.isArray(skills) ? skills.slice(0, 20) : [];
    }

    return [];
  } catch (error) {
    console.log("⚠️ AI skill extraction failed:", error.message);
    return [];
  }
}

/**
 * Enhance resume parsing with AI
 */
async function enhanceResumeParsing(resumeText, existingData) {
  if (!model) {
    console.log("⚠️ Gemini not available for resume enhancement");
    return null;
  }

  try {
    const prompt = `Extract missing information from this resume. Return ONLY a JSON object with these fields (if found): email, phone, skills (array).

Resume:
${resumeText.substring(0, 3000)}

Existing data:
- Email: ${existingData.email || "not found"}
- Phone: ${existingData.phone || "not found"}
- Skills: ${existingData.skills?.length || 0} found

Example output: {"email": "john@example.com", "phone": "9876543210", "skills": ["python", "django"]}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
      ),
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (error) {
    console.log("⚠️ AI resume enhancement failed:", error.message);
    return null;
  }
}

/**
 * Generate intelligent match reasoning using AI
 */
async function generateMatchReasons(resume, jobDescription, ruleBasedScore) {
  if (!model) {
    return [`Rule-based score: ${ruleBasedScore}%`];
  }

  try {
    const prompt = `Analyze why this candidate ${
      ruleBasedScore >= 50 ? "matches" : "does not match"
    } this job. Provide 3-5 brief bullet points.

Candidate:
- Name: ${resume.candidateName}
- Skills: ${(resume.skills || []).slice(0, 10).join(", ")}
- Experience: ${resume.experience?.years || 0} years

Job: ${jobDescription.substring(0, 500)}

Score: ${ruleBasedScore}%

Provide ONLY the reasons as a JSON array of strings. Example: ["Strong React experience", "Lacks AWS knowledge", "Good communication skills"]`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
      ),
    ]);

    const response = await result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const reasons = JSON.parse(jsonMatch[0]);
      return Array.isArray(reasons)
        ? reasons.slice(0, 5)
        : [`Score: ${ruleBasedScore}%`];
    }

    return [`Score: ${ruleBasedScore}%`];
  } catch (error) {
    console.log("⚠️ AI reasoning generation failed:", error.message);
    return [`Rule-based score: ${ruleBasedScore}%`];
  }
}

/**
 * Calculate AI-enhanced match score (semantic understanding)
 * @deprecated Use calculateSemanticMatch instead (kept for backwards compatibility)
 */
async function calculateSemanticMatch(resumeText, jobDescription) {
  if (!model) {
    return null;
  }

  try {
    const prompt = `Rate how well this resume matches this job on a scale of 0-100. Consider skills, experience, and relevance. Return ONLY a number.

Resume snippet:
${resumeText.substring(0, 2000)}

Job:
${jobDescription.substring(0, 1000)}

Output ONLY a number between 0-100:`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
      ),
    ]);

    const response = await result.response;
    const text = response.text().trim();

    const score = parseInt(text.match(/\d+/)?.[0]);
    return score >= 0 && score <= 100 ? score : null;
  } catch (error) {
    console.log("⚠️ AI semantic matching failed:", error.message);
    return null;
  }
}

// ==================== NEW AI-FIRST FUNCTIONS ====================

/**
 * ✅ NEW: Detect job domain/category using AI
 * @param {string} jobTitle - Job title
 * @param {string} jobDescription - Full job description
 * @param {Array} requiredSkills - List of required skills
 * @returns {Promise<Object>} Job domain, confidence, and reasoning
 */
async function detectJobDomain(jobTitle, jobDescription, requiredSkills = []) {
  if (!model) {
    console.log("⚠️ Gemini not available, using fallback detection");
    return { domain: "general", confidence: 0, method: "fallback" };
  }

  try {
    const skillsText =
      requiredSkills.length > 0
        ? `\nRequired Skills: ${requiredSkills.join(", ")}`
        : "";

    const prompt = `You are a job category classification expert.

Analyze this job posting and classify it into ONE of these domains:
1. software_development (programming, coding, software engineering, development)
2. web_development (frontend, backend, full stack web development)
3. data_science (ML, AI, analytics, data engineering, data analyst)
4. network_engineering (networking, infrastructure, cisco, cloud, devops)
5. finance (accounting, taxation, audit, financial analysis, bookkeeping)
6. customs (customs clearance, import/export, trade compliance, duties)
7. marketing (digital marketing, branding, content, campaigns, SEO)
8. human_resources (HR, recruitment, talent acquisition, people ops)
9. sales (business development, account management, sales ops)
10. operations (logistics, supply chain, operations management)
11. design (UI/UX, graphic design, product design, creative)
12. general (anything that doesn't fit the above categories)

Job Title: ${jobTitle}
Job Description: ${jobDescription.substring(0, 1500)}${skillsText}

IMPORTANT:
- If the job mentions "customs", "taxation", "HMRC", "due diligence", "import/export" → classify as "customs" or "finance"
- If the job mentions "accounting", "finance", "financial analysis" → classify as "finance"
- If job mentions "programming", "coding", "software" → classify as "software_development"
- Be very confident in your classification

Return ONLY a JSON object in this exact format:
{
  "domain": "domain_name",
  "confidence": 0.95,
  "reasoning": "Brief 1-sentence explanation"
}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
      ),
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(
        `🤖 AI detected domain: ${parsed.domain} (${Math.round(
          parsed.confidence * 100
        )}% confident)`
      );
      console.log(`   Reasoning: ${parsed.reasoning}`);

      return {
        domain: parsed.domain,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        method: "ai",
      };
    }

    throw new Error("Invalid AI response format");
  } catch (error) {
    console.error("❌ AI job detection failed:", error.message);
    return {
      domain: "general",
      confidence: 0,
      method: "error",
      error: error.message,
    };
  }
}

/**
 * ✅ NEW: Calculate semantic match score between resume and job using AI
 * @param {string} resumeText - Full resume text or JSON string
 * @param {string} jobDescription - Job description
 * @param {string} jobDomain - Detected job domain
 * @returns {Promise<Object>} Match score, strengths, gaps, and recommendation
 */
async function calculateSemanticMatchDetailed(
  resumeText,
  jobDescription,
  jobDomain = "general"
) {
  if (!model) {
    console.log("⚠️ Gemini not available for semantic matching");
    return {
      score: 50,
      confidence: 0,
      strengths: [],
      gaps: [],
      recommendation: "Not recommended",
      reasoning: "AI not available",
      method: "fallback",
    };
  }

  try {
    const prompt = `You are an expert resume screening AI for the ${jobDomain} domain.

Job Domain: ${jobDomain}
Job Description: ${jobDescription.substring(0, 1500)}

Candidate Resume:
${resumeText.substring(0, 2500)}

Analyze how well this candidate matches the job. Consider:
1. Relevant skills and technical expertise
2. Work experience alignment with job requirements
3. Education background relevance to the domain
4. Years of experience vs job requirements
5. Project/internship experience relevance
6. Domain expertise match (e.g., finance skills for finance jobs, NOT tech skills)

CRITICAL:
- If job is in finance/accounting domain and candidate has technical skills (programming, coding) → LOW score (20-40%)
- If job is in tech domain and candidate has finance skills (accounting, tally) → LOW score (20-40%)
- If job is customs/taxation and candidate has relevant finance experience → HIGH score (70-90%)
- Match the PRIMARY domain, not just buzzwords

Return ONLY a JSON object in this exact format:
{
  "matchScore": 75,
  "confidence": 0.90,
  "strengths": ["skill1", "skill2", "relevant experience"],
  "gaps": ["missing_skill1", "missing_skill2"],
  "recommendation": "Strong match | Moderate match | Weak match | Not recommended",
  "reasoning": "2-3 sentence explanation of the score focusing on domain match"
}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
      ),
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(
        `🎯 AI match score: ${parsed.matchScore}% - ${parsed.recommendation}`
      );
      console.log(`   Reasoning: ${parsed.reasoning}`);

      return {
        score: parsed.matchScore,
        confidence: parsed.confidence,
        strengths: parsed.strengths || [],
        gaps: parsed.gaps || [],
        recommendation: parsed.recommendation,
        reasoning: parsed.reasoning,
        method: "ai",
      };
    }

    throw new Error("Invalid AI response format");
  } catch (error) {
    console.error("❌ AI semantic matching failed:", error.message);
    return {
      score: 50,
      confidence: 0,
      strengths: [],
      gaps: [],
      recommendation: "Error",
      reasoning: `AI error: ${error.message}`,
      method: "error",
    };
  }
}

/**
 * Check if Gemini AI is available
 */
function isAvailable() {
  return model !== null;
}

/**
 * Get current model configuration
 */
function getConfig() {
  return {
    model: MODEL_NAME,
    available: isAvailable(),
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
    timeout: TIMEOUT,
  };
}

// ==================== MODULE EXPORTS ====================

module.exports = {
  // Existing functions (keep for backwards compatibility)
  extractSkills,
  enhanceResumeParsing,
  generateMatchReasons,
  calculateSemanticMatch, // Old simple version

  // ✅ NEW AI-FIRST functions
  detectJobDomain,
  calculateSemanticMatchDetailed, // New detailed version (use this one!)

  // Utility functions
  isAvailable,
  getConfig,
};
