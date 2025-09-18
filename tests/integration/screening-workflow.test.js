/**
 * Integration tests for complete screening workflow
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');
const Screening = require('../../models/Screening');
const { createTestResumeInDB, cleanupTestData } = require('../helpers/apiHelpers');

describe('Screening Workflow Integration Tests', () => {
  let testResumes;

  beforeEach(async () => {
    await cleanupTestData();

    // Create diverse test candidates
    testResumes = [
      await createTestResumeInDB({
        candidateName: 'JavaScript Expert',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
        experience: { years: 5, positions: ['Senior Developer'] },
        education: { degree: "Bachelor's", institution: 'Tech University' },
        extractedText: 'Experienced JavaScript developer with React and Node.js'
      }),
      await createTestResumeInDB({
        candidateName: 'Python Developer',
        email: 'python@dev.com',
        skills: ['Python', 'Django', 'PostgreSQL'],
        experience: { years: 3, positions: ['Backend Developer'] },
        education: { degree: "Master's", institution: 'CS University' }
      }),
      await createTestResumeInDB({
        candidateName: 'Junior Frontend',
        email: 'junior@dev.com',
        skills: ['HTML', 'CSS', 'JavaScript'],
        experience: { years: 1, positions: ['Junior Developer'] },
        education: { degree: "Bachelor's", institution: 'Web Academy' }
      })
    ];
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /screening', () => {
    it('should render screening form with candidate count', async () => {
      const response = await request(app)
        .get('/screening')
        .expect(200);

      expect(response.text).toContain('Screen Candidates');
      expect(response.text).toContain('3 processed'); // Our test candidates
      expect(response.text).toContain('Start Screening'); // Form button
    });
  });

  describe('POST /screening - Complete Workflow', () => {
    it('should perform JavaScript developer screening successfully', async () => {
      const jobRequirements = {
        jobTitle: 'Senior Frontend Developer',
        jobDescription: 'Looking for React expert with Node.js experience',
        requiredSkills: ['JavaScript', 'React', 'Node.js'],
        minExp: 3,
        maxExp: 7,
        educationLevel: "Bachelor's"
      };

      const response = await request(app)
        .post('/screening')
        .send(jobRequirements)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.screeningId).toBeDefined();
      expect(response.body.statistics.totalCandidates).toBe(3);
      expect(response.body.statistics.qualifiedCandidates).toBeGreaterThan(0);

      // Verify screening was saved to database
      const savedScreening = await Screening.findById(response.body.screeningId);
      expect(savedScreening).toBeDefined();
      expect(savedScreening.jobTitle).toBe('Senior Frontend Developer');
      expect(savedScreening.results).toHaveLength(3);

      // Check candidate ranking
      const sortedResults = savedScreening.results.sort((a, b) => b.matchScore - a.matchScore);
      expect(sortedResults[0].candidateName).toBe('JavaScript Expert'); // Should rank highest
      expect(sortedResults[0].matchScore).toBeGreaterThan(80);
    });

    it('should handle screening with no qualified candidates', async () => {
      const jobRequirements = {
        jobTitle: 'Blockchain Specialist',
        requiredSkills: ['Solidity', 'Blockchain', 'Ethereum'],
        minExp: 5,
        maxExp: 10
      };

      const response = await request(app)
        .post('/screening')
        .send(jobRequirements)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics.qualifiedCandidates).toBe(0);
      expect(response.body.statistics.averageScore).toBeLessThan(20);
    });

    it('should apply domain validation penalties correctly', async () => {
      const jobRequirements = {
        jobTitle: 'Accountant',
        requiredSkills: ['Accounting', 'Tally', 'GST'],
        minExp: 2,
        maxExp: 8
      };

      const response = await request(app)
        .post('/screening')
        .send(jobRequirements)
        .expect(200);

      const screening = await Screening.findById(response.body.screeningId);
      
      // Technical candidates should have penalties for accounting role
      const techCandidate = screening.results.find(r => 
        r.candidateName === 'JavaScript Expert'
      );
      expect(techCandidate.matchScore).toBeLessThan(30); // Should be penalized
    });

    it('should validate required fields', async () => {
      const incompleteRequirements = {
        // Missing jobTitle
        requiredSkills: ['JavaScript']
      };

      const response = await request(app)
        .post('/screening')
        .send(incompleteRequirements)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid job requirements');
    });

    it('should handle no processed resumes scenario', async () => {
      // Mark all resumes as unprocessed
      await Resume.updateMany({}, { isProcessed: false });

      const jobRequirements = {
        jobTitle: 'Test Developer',
        requiredSkills: ['JavaScript']
      };

      const response = await request(app)
        .post('/screening')
        .send(jobRequirements)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No processed resumes found');
    });
  });

  describe('GET /screening/results/:id', () => {
    let screeningId;

    beforeEach(async () => {
      const jobRequirements = {
        jobTitle: 'Full Stack Developer',
        requiredSkills: ['JavaScript', 'Node.js'],
        minExp: 2,
        maxExp: 8
      };

      const screeningResponse = await request(app)
        .post('/screening')
        .send(jobRequirements);

      screeningId = screeningResponse.body.screeningId;
    });

    it('should render screening results page with candidate data', async () => {
      const response = await request(app)
        .get(`/screening/results/${screeningId}`)
        .expect(200);

      expect(response.text).toContain('Full Stack Developer'); // Job title
      expect(response.text).toContain('JavaScript Expert'); // Top candidate
      expect(response.text).toContain('Match Score'); // Results table
      expect(response.text).toContain('Candidate Ranking'); // Section header
    });

    it('should return 404 for invalid screening ID', async () => {
      const invalidId = '507f1f77bcf86cd799439011';
      
      await request(app)
        .get(`/screening/results/${invalidId}`)
        .expect(404);
    });

    it('should handle malformed screening ID', async () => {
      await request(app)
        .get('/screening/results/invalid-id')
        .expect(400);
    });
  });

  describe('GET /screening/api/results/:id', () => {
    let screeningId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/screening')
        .send({
          jobTitle: 'API Test Developer',
          requiredSkills: ['JavaScript', 'API', 'REST'],
          minExp: 1,
          maxExp: 5
        });

      screeningId = response.body.screeningId;
    });

    it('should return screening results as JSON with full data', async () => {
      const response = await request(app)
        .get(`/screening/api/results/${screeningId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.jobTitle).toBe('API Test Developer');
      expect(response.body.requiredSkills).toEqual(['JavaScript', 'API', 'REST']);
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results.length).toBe(3);
      expect(response.body.statistics).toEqual({
        totalCandidates: 3,
        qualifiedCandidates: expect.any(Number),
        averageScore: expect.any(Number),
        topScore: expect.any(Number)
      });

      // Check result structure
      const result = response.body.results[0];
      expect(result).toHaveProperty('candidateName');
      expect(result).toHaveProperty('matchScore');
      expect(result).toHaveProperty('skillsMatch');
      expect(result).toHaveProperty('experienceMatch');
    });
  });

  describe('DELETE /screening/:id', () => {
    let screeningId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/screening')
        .send({
          jobTitle: 'Delete Test',
          requiredSkills: ['JavaScript']
        });

      screeningId = response.body.screeningId;
    });

    it('should delete screening successfully', async () => {
      const response = await request(app)
        .delete(`/screening/${screeningId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletedId).toBe(screeningId);

      // Verify deletion
      const deletedScreening = await Screening.findById(screeningId);
      expect(deletedScreening).toBeNull();
    });

    it('should return 404 for non-existent screening', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/screening/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /screening/all', () => {
    beforeEach(async () => {
      // Create multiple screenings
      await Promise.all([
        request(app)
          .post('/screening')
          .send({
            jobTitle: 'Frontend Developer',
            requiredSkills: ['JavaScript', 'React']
          }),
        request(app)
          .post('/screening')
          .send({
            jobTitle: 'Backend Developer', 
            requiredSkills: ['Node.js', 'MongoDB']
          })
      ]);
    });

    it('should list all screenings with pagination', async () => {
      const response = await request(app)
        .get('/screening/all')
        .expect(200);

      expect(response.text).toContain('All Screenings');
      expect(response.text).toContain('Frontend Developer');
      expect(response.text).toContain('Backend Developer');
    });
  });
});
