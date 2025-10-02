/**
 * Helper functions for integration testing
 */
const Resume = require('../../models/Resume');
const Screening = require('../../models/Screening');

/**
 * Create and save a test resume in the database
 * @param {Object} overrides - Fields to override in the default resume
 * @returns {Promise<Resume>} - Saved Resume document
 */
async function createTestResumeInDB(overrides = {}) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  const defaultResume = {
    candidateName: 'Test Candidate',
    email: `test${timestamp}${random}@example.com`, // Unique email
    phone: '+1234567890',
    filename: `test-resume-${timestamp}-${random}.pdf`, // Unique filename
    originalName: `test-resume-${timestamp}-${random}.pdf`,
    extractedText: 'Test resume content with JavaScript and React skills',
    skills: ['JavaScript', 'React', 'Node.js'],
    experience: { years: 3, positions: ['Developer'] },
    education: { degree: "Bachelor's", institution: 'Test University' },
    isProcessed: true,
    uploadDate: new Date(),
    ...overrides
  };

  const resume = new Resume(defaultResume);
  return await resume.save();
}

/**
 * Create and save multiple test resumes
 * @param {number} count - Number of resumes to create
 * @returns {Promise<Array<Resume>>} - Array of saved Resume documents
 */
async function createMultipleTestResumes(count = 5) {
  const resumes = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const resume = await createTestResumeInDB({
      candidateName: `Test Candidate ${i + 1}`,
      email: `test${i + 1}${timestamp}@example.com`,
      filename: `test-resume-${i + 1}-${timestamp}.pdf`,
      originalName: `Test Resume ${i + 1}.pdf`,
      isProcessed: i % 2 === 0,
      skills: i % 2 === 0 ? ['JavaScript', 'React'] : ['Python', 'Django']
    });
    resumes.push(resume);
  }

  return resumes;
}

/**
 * Create and save a test screening in the database
 * @param {Object} overrides - Fields to override in the default screening
 * @returns {Promise<Screening>} - Saved Screening document
 */
async function createTestScreeningInDB(overrides = {}) {
  const defaultScreening = {
    jobTitle: 'Test Developer',
    jobDescription: 'Test job description',
    requiredSkills: ['JavaScript', 'React'],
    experienceLevel: { min: 2, max: 5 },
    educationLevel: "Bachelor's",
    results: [],
    statistics: {
      totalCandidates: 0,
      qualifiedCandidates: 0,
      averageScore: 0,
      topScore: 0
    },
    ...overrides
  };

  const screening = new Screening(defaultScreening);
  return await screening.save();
}

/**
 * Clean up test data from database collections
 */
async function cleanupTestData() {
  await Resume.deleteMany({});
  await Screening.deleteMany({});
}

module.exports = {
  createTestResumeInDB,
  createMultipleTestResumes,
  createTestScreeningInDB,
  cleanupTestData
};
