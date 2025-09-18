/**
 * Common test utilities and helpers
 */
const Resume = require('../../models/Resume');
const Screening = require('../../models/Screening');

/**
 * Creates a test resume document with all required fields
 * @param {Object} overrides - Properties to override
 * @returns {Resume} Resume document
 */
function createTestResume(overrides = {}) {
  return new Resume({
    candidateName: 'Test Candidate',
    email: 'test@example.com',
    phone: '+1234567890',
    filename: 'test-resume.pdf',        // ✅ REQUIRED FIELD
    originalName: 'test-resume.pdf',    // ✅ REQUIRED FIELD  
    extractedText: 'Test resume content...', // ✅ REQUIRED FIELD
    skills: ['JavaScript', 'Node.js', 'React'],
    experience: { years: 3, positions: ['Developer'] },
    education: { degree: "Bachelor's", institution: 'Test University' },
    isProcessed: true,
    uploadDate: new Date(),
    ...overrides
  });
}

/**
 * Creates a test screening document
 * @param {Object} overrides - Properties to override
 * @returns {Screening} Screening document
 */
function createTestScreening(overrides = {}) {
  return new Screening({
    jobTitle: 'Test Developer',
    jobDescription: 'Test job description',
    requiredSkills: ['JavaScript', 'React'],
    experienceLevel: { min: 2, max: 5 },  // ✅ VALID RANGE
    educationLevel: "Bachelor's",
    results: [],
    statistics: {
      totalCandidates: 0,
      qualifiedCandidates: 0,
      averageScore: 0,
      topScore: 0
    },
    ...overrides
  });
}

module.exports = {
  createTestResume,
  createTestScreening
};
