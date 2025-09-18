/**
 * @fileoverview Enhanced Validation Helpers with Advanced Skill Matching
 * @author Resume Screening System
 * @version 3.0.0
 */

const skillExtractor = require('./skillExtractor');

/**
 * Calculate skill match percentage between resume and job requirements
 */
function calculateSkillMatch(resumeSkills, jobRequiredSkills) {
  if (!Array.isArray(resumeSkills) || !Array.isArray(jobRequiredSkills)) {
    return { matchPercentage: 0, matchedSkills: [], missingSkills: [] };
  }

  if (jobRequiredSkills.length === 0) {
    return { matchPercentage: 100, matchedSkills: [], missingSkills: [] };
  }

  const resumeSkillsLower = resumeSkills.map(skill => skill.toLowerCase());
  const jobSkillsLower = jobRequiredSkills.map(skill => skill.toLowerCase());

  const matchedSkills = [];
  const missingSkills = [];

  jobSkillsLower.forEach((jobSkill, index) => {
    const isMatched = resumeSkillsLower.some(resumeSkill => 
      resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)
    );

    if (isMatched) {
      matchedSkills.push(jobRequiredSkills[index]);
    } else {
      missingSkills.push(jobRequiredSkills[index]);
    }
  });

  const matchPercentage = Math.round((matchedSkills.length / jobRequiredSkills.length) * 100);

  return {
    matchPercentage,
    matchedSkills,
    missingSkills
  };
}

/**
 * Validate skills relevance for specific job types
 */
function validateSkillsRelevance(resumeSkills, jobRequiredSkills, jobTitle) {
  try {
    if (!Array.isArray(resumeSkills)) resumeSkills = [];
    if (!Array.isArray(jobRequiredSkills)) jobRequiredSkills = [];
    if (!jobTitle || typeof jobTitle !== 'string') jobTitle = '';

    const jobTitleLower = jobTitle.toLowerCase();
    const resumeSkillsLower = resumeSkills.map(skill => 
      typeof skill === 'string' ? skill.toLowerCase() : String(skill).toLowerCase()
    );

    // Define skill categories
    const skillCategories = {
      accounting: [
        'accounting', 'finance', 'tally', 'sap', 'excel', 'gst', 'tds', 
        'bookkeeping', 'quickbooks', 'taxation', 'financial analysis', 'auditing',
        'accounts payable', 'accounts receivable', 'financial reporting'
      ],
      technical: [
        'java', 'python', 'javascript', 'html', 'css', 'react', 'node.js', 
        'angular', 'vue', 'mongodb', 'mysql', 'git', 'docker', 'aws', 'programming',
        'software development', 'web development', 'mobile development'
      ],
      marketing: [
        'digital marketing', 'seo', 'sem', 'social media', 'content marketing',
        'google ads', 'facebook ads', 'analytics', 'email marketing'
      ],
      sales: [
        'sales', 'crm', 'lead generation', 'business development', 'negotiation',
        'customer relationship', 'salesforce'
      ]
    };

    // Check for job-skill mismatch
    if (jobTitleLower.includes('account') || jobTitleLower.includes('finance') || 
        jobTitleLower.includes('bookkeep')) {
      
      const hasAccountingSkills = resumeSkillsLower.some(skill =>
        skillCategories.accounting.some(accSkill => skill.includes(accSkill))
      );
      
      const hasTechnicalSkills = resumeSkillsLower.some(skill =>
        skillCategories.technical.some(techSkill => skill.includes(techSkill))
      );

      if (!hasAccountingSkills && hasTechnicalSkills) {
        return {
          isRelevant: false,
          penalty: 0.4,
          reason: 'Technical background detected - not suitable for accounting position',
          confidence: 0.8
        };
      }
    }

    // Calculate overall relevance
    const skillMatch = calculateSkillMatch(resumeSkills, jobRequiredSkills);
    
    return {
      isRelevant: skillMatch.matchPercentage >= 30,
      penalty: skillMatch.matchPercentage < 30 ? 0.3 : 0,
      reason: skillMatch.matchPercentage < 30 ? 'Low skill match with job requirements' : 'Good skill relevance',
      confidence: skillMatch.matchPercentage / 100,
      skillMatch: skillMatch
    };

  } catch (error) {
    console.error('Error in validateSkillsRelevance:', error.message);
    return { 
      isRelevant: true, 
      penalty: 0, 
      reason: 'Validation error - defaulting to relevant',
      confidence: 0.5
    };
  }
}

/**
 * Validate education background for job requirements
 */
function validateEducation(resumeEducation, jobTitle, jobRequiredEducation = []) {
  try {
    if (!resumeEducation || !jobTitle) {
      return { suitable: true, penalty: 0, confidence: 0.5 };
    }

    const educationCategories = {
      accounting: [
        'bcom', 'b.com', 'mcom', 'm.com', 'bba', 'mba', 'commerce', 'finance', 
        'accounting', 'ca', 'cs', 'cma', 'acca'
      ],
      technical: [
        'mca', 'bca', 'computer', 'engineering', 'technology', 'b.tech', 'm.tech', 
        'computer science', 'information technology', 'software', 'it'
      ],
      marketing: [
        'marketing', 'business', 'mba', 'bba', 'mass communication', 'journalism'
      ]
    };

    const jobTitleLower = jobTitle.toLowerCase();
    const educationLower = String(resumeEducation).toLowerCase();

    // Check education-job alignment
    if (jobTitleLower.includes('account') || jobTitleLower.includes('finance')) {
      const hasAccountingEducation = educationCategories.accounting.some(edu =>
        educationLower.includes(edu)
      );
      
      const hasTechnicalEducation = educationCategories.technical.some(edu =>
        educationLower.includes(edu)
      );

      if (!hasAccountingEducation && hasTechnicalEducation) {
        return {
          suitable: false,
          penalty: 0.25,
          reason: `${resumeEducation} (Technical) - not ideal for accounting positions`,
          confidence: 0.8
        };
      }
    }

    // Check specific education requirements
    if (jobRequiredEducation.length > 0) {
      const meetsRequirement = jobRequiredEducation.some(reqEdu =>
        educationLower.includes(reqEdu.toLowerCase())
      );

      if (!meetsRequirement) {
        return {
          suitable: false,
          penalty: 0.2,
          reason: `Education doesn't match job requirements: ${jobRequiredEducation.join(', ')}`,
          confidence: 0.7
        };
      }
    }

    return { 
      suitable: true, 
      penalty: 0, 
      reason: 'Education suitable for position',
      confidence: 0.8
    };

  } catch (error) {
    console.error('Error in validateEducation:', error.message);
    return { 
      suitable: true, 
      penalty: 0, 
      reason: 'Validation error - defaulting to suitable',
      confidence: 0.5
    };
  }
}

/**
 * Validate experience requirements
 */
function validateExperience(resumeExperience, jobMinExperience = 0, jobMaxExperience = 50) {
  try {
    const experience = typeof resumeExperience === 'number' ? resumeExperience : 
                     (resumeExperience?.years || 0);

    if (experience < jobMinExperience) {
      const penalty = Math.min((jobMinExperience - experience) * 0.1, 0.5);
      return {
        suitable: false,
        penalty: penalty,
        reason: `Insufficient experience: ${experience} years (minimum: ${jobMinExperience})`,
        confidence: 0.9
      };
    }

    if (experience > jobMaxExperience) {
      return {
        suitable: false,
        penalty: 0.2,
        reason: `Overqualified: ${experience} years (maximum: ${jobMaxExperience})`,
        confidence: 0.7
      };
    }

    return {
      suitable: true,
      penalty: 0,
      reason: `Experience suitable: ${experience} years`,
      confidence: 0.9
    };

  } catch (error) {
    console.error('Error in validateExperience:', error.message);
    return { 
      suitable: true, 
      penalty: 0,
      reason: 'Validation error - defaulting to suitable',
      confidence: 0.5
    };
  }
}

/**
 * Comprehensive resume validation
 */
function validateResume(resume, jobRequirements = {}) {
  const {
    jobTitle = '',
    requiredSkills = [],
    requiredEducation = [],
    minExperience = 0,
    maxExperience = 50
  } = jobRequirements;

  const validations = {
    skills: validateSkillsRelevance(resume.skills, requiredSkills, jobTitle),
    education: validateEducation(resume.education?.degree, jobTitle, requiredEducation),
    experience: validateExperience(resume.experience, minExperience, maxExperience)
  };

  const totalPenalty = validations.skills.penalty + 
                      validations.education.penalty + 
                      validations.experience.penalty;

  const overallScore = Math.max(0, 100 - (totalPenalty * 100));

  return {
    overallScore: Math.round(overallScore),
    validations: validations,
    isQualified: overallScore >= 60,
    summary: {
      skillMatch: validations.skills.skillMatch?.matchPercentage || 0,
      educationSuitable: validations.education.suitable,
      experienceSuitable: validations.experience.suitable,
      overallSuitable: overallScore >= 60
    }
  };
}

module.exports = {
  validateSkillsRelevance,
  validateEducation,
  validateExperience,
  validateResume,
  calculateSkillMatch
};
