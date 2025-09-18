/**
 * @fileoverview Advanced Skill Extraction with Technical Filtering
 * @author Resume Screening System
 * @version 3.0.0
 */

// Comprehensive technical skills database
const TECHNICAL_SKILLS = {
  programming: [
    'javascript', 'python', 'java', 'go', 'golang', 'c', 'c++', 'cpp', 'c#', 'csharp', 
    'php', 'ruby', 'swift', 'kotlin', 'typescript', 'scala', 'rust', 'perl', 'r', 
    'matlab', 'objective-c', 'dart', 'haskell', 'lua', 'bash', 'powershell'
  ],

  web: [
    'html', 'css', 'sass', 'scss', 'less', 'bootstrap', 'tailwind', 'react', 'angular', 
    'vue', 'svelte', 'jquery', 'webpack', 'vite', 'gulp', 'grunt', 'babel', 'eslint'
  ],

  backend: [
    'node.js', 'nodejs', 'express', 'express.js', 'django', 'flask', 'spring', 
    'spring boot', 'laravel', 'symfony', 'rails', 'fastapi', 'gin', 'fiber',
    'nest.js', 'nestjs', 'koa', 'hapi'
  ],

  databases: [
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'sql server',
    'dynamodb', 'cassandra', 'elasticsearch', 'neo4j', 'firebase', 'sql', 'nosql',
    'mariadb', 'couchdb'
  ],

  cloud: [
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 
    'terraform', 'ansible', 'vagrant', 'git', 'github', 'gitlab', 'bitbucket',
    'ci/cd', 'devops', 'nginx', 'apache', 'linux', 'ubuntu', 'centos'
  ],

  data: [
    'machine learning', 'deep learning', 'artificial intelligence', 'data science',
    'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'keras', 'opencv',
    'nlp', 'computer vision', 'data analysis', 'statistics', 'big data', 'hadoop',
    'spark', 'kafka', 'airflow'
  ],

  mobile: [
    'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova'
  ],

  tools: [
    'api', 'rest api', 'restful', 'graphql', 'microservices', 'websockets', 
    'json', 'xml', 'oauth', 'jwt', 'testing', 'unit testing', 'jest', 'mocha',
    'selenium', 'postman', 'swagger', 'agile', 'scrum', 'jira', 'confluence'
  ]
};

// Non-technical terms to filter out
const NON_TECHNICAL_TERMS = [
  'fast learner', 'team player', 'hard working', 'dedicated', 'motivated',
  'excellent communication', 'leadership', 'problem solving', 'analytical',
  'detail oriented', 'self motivated', 'quick learner', 'adaptable',
  'responsible', 'reliable', 'efficient', 'proactive', 'innovative',
  'creative', 'passionate', 'enthusiastic', 'ambitious', 'professional',
  'team work', 'communication skills', 'interpersonal skills'
];

// Create flat array of all technical skills
const ALL_TECHNICAL_SKILLS = Object.values(TECHNICAL_SKILLS).flat();

class SkillExtractor {
  constructor() {
    // Simple tokenization without external dependencies
    this.commonAbbreviations = {
      'js': 'JavaScript',
      'ts': 'TypeScript', 
      'py': 'Python',
      'cpp': 'C++',
      'csharp': 'C#',
      'golang': 'Go',
      'reactjs': 'React',
      'angularjs': 'Angular',
      'vuejs': 'Vue',
      'nodejs': 'Node.js',
      'expressjs': 'Express.js',
      'nestjs': 'Nest.js',
      'mongo': 'MongoDB',
      'postgres': 'PostgreSQL',
      'k8s': 'Kubernetes',
      'db': 'Database'
    };
  }

  /**
   * Clean and normalize a skill string
   */
  cleanSkill(rawSkill) {
    if (!rawSkill || typeof rawSkill !== 'string') return null;

    // Remove special characters and clean
    let skill = rawSkill.toLowerCase()
      .replace(/[\[\]{}()<>\-_:;!@#$%^&*+=\/\\|"']/g, ' ')
      .replace(/\b\d+\s*(years?|yrs?|months?|days?)\b/g, ' ') // Remove time references
      .replace(/\b\d+\b/g, ' ') // Remove standalone numbers
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    if (skill.length < 2 || skill.length > 30) return null;

    // Handle abbreviations
    if (this.commonAbbreviations[skill]) {
      return this.commonAbbreviations[skill];
    }

    // Special formatting cases
    if (skill === 'html') return 'HTML';
    if (skill === 'css') return 'CSS';
    if (skill === 'sql') return 'SQL';
    if (skill === 'api') return 'API';
    if (skill === 'c++') return 'C++';
    if (skill === 'c#') return 'C#';
    if (skill.includes('node') && skill.includes('js')) return 'Node.js';
    if (skill.includes('express') && skill.includes('js')) return 'Express.js';

    // Capitalize properly
    return skill.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract skills from resume text using multiple methods
   */
  extractSkills(text) {
    if (!text || typeof text !== 'string') return [];

    console.log('🔍 Starting advanced skill extraction...');

    const extractedSkills = new Set();

    // Method 1: Direct matching with technical skills database
    ALL_TECHNICAL_SKILLS.forEach(skill => {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'gi');
      
      if (regex.test(text)) {
        const cleaned = this.cleanSkill(skill);
        if (cleaned) {
          extractedSkills.add(cleaned);
        }
      }
    });

    // Method 2: Extract from skill sections
    const skillSections = this.extractFromSkillSections(text);
    skillSections.forEach(skill => {
      const cleaned = this.cleanSkill(skill);
      if (cleaned && this.isTechnicalSkill(cleaned)) {
        extractedSkills.add(cleaned);
      }
    });

    // Method 3: Common technology patterns
    const techPatterns = [
      /\b(react|angular|vue|node|express|django|flask|spring|laravel)\b/gi,
      /\b(mysql|mongodb|postgresql|redis|oracle|sql server)\b/gi,
      /\b(aws|azure|gcp|docker|kubernetes|jenkins|git)\b/gi,
      /\b(python|java|javascript|typescript|golang?|php|ruby|swift)\b/gi,
      /\b(html5?|css3?|sass|scss|bootstrap|tailwind)\b/gi,
      /\b(api|rest|graphql|json|xml|microservices)\b/gi
    ];

    techPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const cleaned = this.cleanSkill(match);
        if (cleaned) {
          extractedSkills.add(cleaned);
        }
      });
    });

    // Convert to array and filter
    let skills = Array.from(extractedSkills);
    
    // Remove non-technical terms
    skills = skills.filter(skill => {
      const skillLower = skill.toLowerCase();
      return !NON_TECHNICAL_TERMS.some(nonTech => 
        skillLower.includes(nonTech.toLowerCase()) || 
        nonTech.toLowerCase().includes(skillLower)
      );
    });

    // Remove very short or very long terms
    skills = skills.filter(skill => skill.length >= 2 && skill.length <= 25);

    // Remove duplicates (case-insensitive)
    const uniqueSkills = [];
    const seenSkills = new Set();
    
    skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      if (!seenSkills.has(lowerSkill)) {
        seenSkills.add(lowerSkill);
        uniqueSkills.push(skill);
      }
    });

    // Sort and limit
    const finalSkills = uniqueSkills
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 20);

    console.log(`✅ Extracted ${finalSkills.length} technical skills:`, finalSkills);
    return finalSkills;
  }

  /**
   * Extract skills from dedicated skill sections in resume
   */
  extractFromSkillSections(text) {
    const skills = [];
    
    // Common skill section patterns
    const skillSectionRegex = /(?:skills?|technologies?|technical skills?|programming languages?|tools?|expertise|competencies)[:\s]*\n?([^]*?)(?:\n\s*\n|\n[A-Z][A-Z\s]*:|$)/gi;
    
    let match;
    while ((match = skillSectionRegex.exec(text)) !== null) {
      const sectionText = match[1];
      
      // Extract skills separated by common delimiters
      const extractedFromSection = sectionText
        .split(/[,;|•·\n]/)
        .map(skill => skill.trim())
        .filter(skill => 
          skill.length > 1 && 
          skill.length < 30 && 
          !skill.includes('experience') &&
          !skill.includes('knowledge')
        );
      
      skills.push(...extractedFromSection);
    }
    
    return skills;
  }

  /**
   * Check if a skill is technical
   */
  isTechnicalSkill(skill) {
    if (!skill) return false;
    
    const skillLower = skill.toLowerCase();
    return ALL_TECHNICAL_SKILLS.some(techSkill => {
      const techSkillLower = techSkill.toLowerCase();
      return techSkillLower === skillLower ||
             skillLower.includes(techSkillLower) ||
             techSkillLower.includes(skillLower);
    });
  }

  /**
   * Extract contact information from text
   */
  extractContactInfo(text) {
    const contactInfo = {
      email: null,
      phone: null,
      name: null
    };

    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
    if (emailMatch) {
      contactInfo.email = emailMatch[1].toLowerCase().trim();
    }

    // Extract phone (Indian format)
    const phoneMatch = text.match(/(\+?91[-.\s]?)?[6-9]\d{9}/);
    if (phoneMatch) {
      contactInfo.phone = phoneMatch[0].replace(/\D/g, '');
      if (contactInfo.phone.length > 10) {
        contactInfo.phone = contactInfo.phone.slice(-10); // Keep last 10 digits
      }
    }

    // Extract name (usually in first few lines)
    const firstLines = text.split('\n').slice(0, 3).join(' ');
    const nameMatch = firstLines.match(/\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/);
    if (nameMatch) {
      contactInfo.name = nameMatch[1].trim();
    }

    return contactInfo;
  }

  /**
   * Extract experience information
   */
  extractExperience(text) {
    // Look for experience patterns
    const experiencePatterns = [
      /(\d+)[\s]*(?:years?|yrs?)[\s]*(?:of[\s]*)?(?:experience|exp)/gi,
      /(?:experience|exp)[\s]*:?[\s]*(\d+)[\s]*(?:years?|yrs?)/gi,
      /(\d+)\+?[\s]*(?:years?|yrs?)[\s]*in/gi
    ];

    for (const pattern of experiencePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const years = matches[0].match(/\d+/);
        if (years) {
          const exp = parseInt(years[0]);
          return exp <= 50 ? exp : 0; // Cap at 50 years
        }
      }
    }
    
    return 0;
  }
}

// Export singleton instance
module.exports = new SkillExtractor();
