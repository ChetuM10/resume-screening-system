/**
 * @fileoverview FIXED NLP Service - Enhanced Resume Text Processing
 * @version 4.0.0 - BULLETPROOF extraction algorithms
 */

const natural = require("natural");

// Enhanced skills database
const COMMON_SKILLS = [
  'javascript', 'js', 'python', 'java', 'react', 'node.js', 'nodejs', 'html', 'css', 'sql',
  'mongodb', 'mysql', 'postgresql', 'git', 'github', 'docker', 'aws', 'azure', 'gcp',
  'angular', 'vue', 'express.js', 'express', 'bootstrap', 'jquery', 'php', 'c++', 'c#',
  'ruby', 'go', 'golang', 'swift', 'kotlin', 'flutter', 'dart', 'redis', 'elasticsearch',
  'kubernetes', 'jenkins', 'linux', 'ubuntu', 'windows', 'macos', 'android', 'ios',
  'photoshop', 'illustrator', 'figma', 'sketch', 'excel', 'word', 'powerpoint', 'office',
  'tableau', 'power bi', 'powerbi', 'salesforce', 'jira', 'confluence', 'slack', 'teams',
  'rest api', 'restful', 'graphql', 'microservices', 'agile', 'scrum', 'devops', 'ci/cd',
  'machine learning', 'ml', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'scikit-learn', 'opencv', 'nlp', 'data science', 'analytics', 'big data', 'spark',
  'django', 'flask', 'spring', 'laravel', 'codeigniter', 'wordpress', 'drupal',
  'typescript', 'sass', 'less', 'webpack', 'babel', 'npm', 'yarn', 'gulp', 'grunt'
];

// ✅ FIXED: Simple and effective name extraction
function extractName(text) {
  console.log("🔍 FIXED: Starting name extraction...");
  
  if (!text || typeof text !== 'string') {
    console.log("❌ No valid text for name extraction");
    return "Unknown Candidate";
  }

  // Clean and split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log(`📝 Processing ${lines.length} lines for name extraction`);

  // Check first 10 lines for a name
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    
    // Skip lines that are clearly not names
    if (line.includes('@') || 
        /\d{3,}/.test(line) || 
        line.length > 50 ||
        line.length < 2 ||
        /^(resume|cv|curriculum|objective|summary|experience|education|skills|projects|contact|address|phone|email)$/i.test(line)) {
      continue;
    }

    // Check if line looks like a name
    const words = line.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 1 && words.length <= 4) {
      // Check if all words are alphabetic (allowing dots for initials)
      if (words.every(word => /^[A-Za-z][A-Za-z.]*$/.test(word))) {
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

// ✅ FIXED: Simplified phone extraction
function extractPhone(text) {
  console.log("🔍 FIXED: Starting phone extraction...");
  
  if (!text) {
    console.log("❌ No text provided for phone extraction");
    return null;
  }

  // Indian phone number patterns
  const phonePatterns = [
    /\+91\s*[6-9]\d{9}/g,  // +91 9876543210
    /91\s*[6-9]\d{9}/g,    // 91 9876543210
    /[6-9]\d{9}/g          // 9876543210
  ];

  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      let phone = matches[0].replace(/\D/g, ''); // Remove non-digits
      
      // Remove country code if present
      if (phone.length === 12 && phone.startsWith('91')) {
        phone = phone.substring(2);
      }
      
      if (phone.length === 10 && phone.match(/^[6-9]/)) {
        console.log(`✅ FOUND PHONE: ${phone}`);
        return phone;
      }
    }
  }

  console.log("❌ No phone found");
  return null;
}

// ✅ FIXED: Enhanced skills extraction
function extractSkills(text) {
  console.log("🔍 FIXED: Starting skills extraction...");
  
  if (!text || typeof text !== 'string') {
    console.log("❌ No valid text for skills extraction");
    return [];
  }

  const textLower = text.toLowerCase();
  const extractedSkills = new Set();

  // Method 1: Direct skill matching against common skills
  console.log("📋 Method 1: Checking common skills...");
  for (const skill of COMMON_SKILLS) {
    if (textLower.includes(skill.toLowerCase())) {
      extractedSkills.add(skill);
    }
  }

  // Method 2: Look for skills in dedicated sections
  console.log("📋 Method 2: Checking skills sections...");
  const skillsSectionRegex = /(?:skills|technologies|technical\s+skills|programming|tools)[:\-\s]+(.*?)(?:\n\s*(?:experience|education|projects|objective|summary|work|employment|career)|$)/is;
  const skillsMatch = text.match(skillsSectionRegex);
  
  if (skillsMatch && skillsMatch[1]) {
    const skillsText = skillsMatch[1];
    console.log(`📝 Found skills section: ${skillsText.substring(0, 200)}...`);
    
    // Parse skills from this section
    const skillsList = skillsText
      .replace(/[,;|\n]/g, ' ')
      .split(' ')
      .map(skill => skill.trim().toLowerCase())
      .filter(skill => skill.length > 2 && skill.length < 20)
      .filter(skill => !/^\d+$/.test(skill)); // Remove numbers

    skillsList.forEach(skill => {
      if (COMMON_SKILLS.some(commonSkill => 
          commonSkill.toLowerCase().includes(skill) || 
          skill.includes(commonSkill.toLowerCase())
        )) {
        extractedSkills.add(skill);
      }
    });
  }

  const finalSkills = Array.from(extractedSkills).slice(0, 25);
  console.log(`✅ FOUND ${finalSkills.length} SKILLS:`, finalSkills);
  
  return finalSkills;
}

// ✅ FIXED: Simplified experience extraction
function extractExperience(text) {
  console.log("🔍 FIXED: Starting experience extraction...");
  
  if (!text) {
    console.log("❌ No text for experience extraction");
    return { years: 0, positions: [], companies: [] };
  }

  let years = 0;
  const positions = [];

  // Look for experience patterns
  const expPatterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/gi,
    /(?:experience|exp)[\s:]*(\d+)\s*(?:years?|yrs?)/gi
  ];

  for (const pattern of expPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const extractedYears = parseInt(match[1]) || 0;
      if (extractedYears > years && extractedYears <= 50) {
        years = extractedYears;
      }
    }
  }

  // Check for fresher/intern keywords
  const textLower = text.toLowerCase();
  if (textLower.includes('fresher') || textLower.includes('fresh graduate')) {
    years = 0;
    positions.push('Fresher');
  }

  if (textLower.includes('intern') || textLower.includes('internship')) {
    if (years === 0) years = 0;
    positions.push('Intern');
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
    { pattern: /bachelor|b\.tech|b\.sc|bca|b\.com|be\s|b\.e/i, level: "Bachelor's" },
    { pattern: /diploma/i, level: "Diploma" },
    { pattern: /12th|higher\s+secondary|\+2/i, level: "12th" },
    { pattern: /10th|secondary|sslc/i, level: "10th" }
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

// ✅ FIXED: Main processing function
async function processResumeText(text) {
  if (!text || !text.trim()) {
    throw new Error("Empty or invalid text provided for resume processing");
  }

  console.log("🔄 FIXED: Starting resume processing...");
  console.log(`📊 Text length: ${text.length} characters`);
  
  const startTime = Date.now();

  try {
    const parsed = {
      name: extractName(text),
      email: extractEmail(text),
      phone: extractPhone(text),
      skills: extractSkills(text),
      experience: extractExperience(text),
      education: extractEducation(text),
      processingTime: 0,
      confidence: 0
    };

    const processingTime = Date.now() - startTime;
    parsed.processingTime = processingTime;

    // Calculate confidence based on extracted data
    let confidence = 20; // Base confidence
    if (parsed.name && parsed.name !== "Unknown Candidate") confidence += 30;
    if (parsed.email) confidence += 25;
    if (parsed.phone) confidence += 15;
    if (parsed.skills && parsed.skills.length > 0) confidence += 25;
    if (parsed.experience && parsed.experience.years >= 0) confidence += 5;

    parsed.confidence = Math.min(100, confidence);

    console.log(`✅ FIXED: Processing completed in ${processingTime}ms`);
    console.log(`📊 FINAL RESULT:`, {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      skillsCount: parsed.skills?.length || 0,
      skills: parsed.skills?.slice(0, 5) || [], // Show first 5 skills
      experience: parsed.experience?.years || 0,
      education: parsed.education,
      confidence: parsed.confidence
    });

    return parsed;

  } catch (error) {
    console.error('❌ Error in resume processing:', error);
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
    extractName
  }
};
