/**
 * @fileoverview Gemini AI Service - Wrapper for Google Generative AI
 * @version 1.0.0 - Production Ready with Fallbacks
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 2000;
const TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 30000;

// Initialize Gemini
let genAI = null;
let model = null;

if (API_KEY && API_KEY !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    console.log(`✅ Gemini AI initialized: ${MODEL_NAME}`);
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error.message);
  }
} else {
  console.log('⚠️ Gemini API key not configured');
}

/**
 * Extract skills from resume text using AI
 */
async function extractSkills(resumeText) {
  if (!model) {
    console.log('⚠️ Gemini not available for skill extraction');
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
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      )
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
    console.log('⚠️ AI skill extraction failed:', error.message);
    return [];
  }
}

/**
 * Enhance resume parsing with AI
 */
async function enhanceResumeParsing(resumeText, existingData) {
  if (!model) {
    console.log('⚠️ Gemini not available for resume enhancement');
    return null;
  }

  try {
    const prompt = `Extract missing information from this resume. Return ONLY a JSON object with these fields (if found): email, phone, skills (array).

Resume:
${resumeText.substring(0, 3000)}

Existing data:
- Email: ${existingData.email || 'not found'}
- Phone: ${existingData.phone || 'not found'}
- Skills: ${existingData.skills?.length || 0} found

Example output: {"email": "john@example.com", "phone": "9876543210", "skills": ["python", "django"]}`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      )
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
    console.log('⚠️ AI resume enhancement failed:', error.message);
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
    const prompt = `Analyze why this candidate ${ruleBasedScore >= 50 ? 'matches' : 'does not match'} this job. Provide 3-5 brief bullet points.

Candidate:
- Name: ${resume.candidateName}
- Skills: ${(resume.skills || []).slice(0, 10).join(', ')}
- Experience: ${resume.experience?.years || 0} years

Job: ${jobDescription.substring(0, 500)}

Score: ${ruleBasedScore}%

Provide ONLY the reasons as a JSON array of strings. Example: ["Strong React experience", "Lacks AWS knowledge", "Good communication skills"]`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      )
    ]);

    const response = await result.response;
    const text = response.text().trim();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const reasons = JSON.parse(jsonMatch[0]);
      return Array.isArray(reasons) ? reasons.slice(0, 5) : [`Score: ${ruleBasedScore}%`];
    }

    return [`Score: ${ruleBasedScore}%`];
  } catch (error) {
    console.log('⚠️ AI reasoning generation failed:', error.message);
    return [`Rule-based score: ${ruleBasedScore}%`];
  }
}

/**
 * Calculate AI-enhanced match score (semantic understanding)
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
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      )
    ]);

    const response = await result.response;
    const text = response.text().trim();
    
    const score = parseInt(text.match(/\d+/)?.[0]);
    return (score >= 0 && score <= 100) ? score : null;
  } catch (error) {
    console.log('⚠️ AI semantic matching failed:', error.message);
    return null;
  }
}

module.exports = {
  extractSkills,
  enhanceResumeParsing,
  generateMatchReasons,
  calculateSemanticMatch,
  isAvailable: () => model !== null,
};
