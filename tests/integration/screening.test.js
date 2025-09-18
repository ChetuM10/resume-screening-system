/**
 * Integration tests for screening workflow
 * Tests complete screening process from submission to results
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');
const Screening = require('../../models/Screening');
const { createTestResume } = require('../setup/testHelpers');

describe('Screening Workflow Integration Tests', () => {
  let testResumes;

  beforeEach(async () => {
    // Create test resumes with different skill sets
    testResumes = [
      createTestResume({
        candidateName: 'JavaScript Developer',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: { years: 3 },
        education: { degree: "Bachelor's" },
        isProcessed: true
      }),
      createTestResume({
        candidateName: 'Python Developer',
        skills: ['Python', 'Django', 'PostgreSQL'],
        experience: { years: 5 },
        education: { degree: "Master's" },
        isProcessed: true
      }),
      createTestResume({
        candidateName: 'Accountant',
        skills: ['Accounting', 'Tally', 'GST'],
        experience: { years: 2 },
        education: { degree: "B.Com" },
        isProcessed: true
      })
    ];

    await Promise.all(testResumes.map(resume => resume.save()));
  });

  describe('GET /screening', () => {
    it('should render screening form page', async () => {
      const response = await request(app)
        .get('/screening')
        .expect(200);

      expect(response.text).toContain('Screen Candidates');
      expect(response.text).toContain('3 processed'); // Our test data
    });
  });

  describe('POST /screening', () => {
    it('should process screening for JavaScript position', async () => {
      const jobRequirements = {
        jobTitle: 'Frontend Developer',
        jobDescription: 'Looking for React developer',
        requiredSkills: ['JavaScript', 'React'],
        minExp: 2,
        maxExp: 5,
        educationLevel: "Bachelor's"
      };

      const response = await request(app)
        .post('/screening')
        .send(jobRequirements)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.screeningId).toBeDefined();
      expect(response.body.statistics.totalCandidates).toBe(3);
      expect(response.body.statistics.qualifiedCandidates).toBeGreaterThan(0);

      // Verify screening was saved
      const savedScreening = await Screening.findById(response.body.screeningId);
      expect(savedScreening).toBeDefined();
      expect(savedScreening.jobTitle).toBe('Frontend Developer');
    });

    it('should apply domain validation penalties', async () => {
      const jobRequirements = {
        jobTitle: 'Software Developer',
        requiredSkills: ['JavaScript', 'React'],
        minExp: 1,
        maxExp: 10
      };

      const response = await request(app)
        .post('/screening')
        .send(jobRequirements)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify screening was processed
      const screening = await Screening.findById(response.body.screeningId)
        .populate('results');
      
      // JavaScript Developer should score highest
      const jsDevResult = screening.results.find(r => 
        r.candidateName === 'JavaScript Developer'
      );
      
      // Accountant should have low score due to domain mismatch
      const accountantResult = screening.results.find(r => 
        r.candidateName === 'Accountant'
      );
      
      expect(jsDevResult.matchScore).toBeGreaterThan(accountantResult.matchScore);
    });

    it('should handle validation errors', async () => {
      const invalidRequirements = {
        // Missing jobTitle
        requiredSkills: ['JavaScript']
      };

      const response = await request(app)
        .post('/screening')
        .send(invalidRequirements)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid job requirements');
    });

    it('should handle no processed resumes', async () => {
      // Mark all resumes as unprocessed
      await Resume.updateMany({}, { isProcessed: false });

      const jobRequirements = {
        jobTitle: 'Developer',
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
      // Create a screening first
      const response = await request(app)
        .post('/screening')
        .send({
          jobTitle: 'Test Developer',
          requiredSkills: ['JavaScript'],
          minExp: 0,
          maxExp: 10
        });

      screeningId = response.body.screeningId;
    });

    it('should render screening results page', async () => {
      const response = await request(app)
        .get(`/screening/results/${screeningId}`)
        .expect(200);

      expect(response.text).toContain('Test Developer');
      expect(response.text).toContain('JavaScript Developer'); // Our test candidate
    });

    it('should return 404 for invalid screening ID', async () => {
      const invalidId = new require('mongoose').Types.ObjectId();
      
      await request(app)
        .get(`/screening/results/${invalidId}`)
        .expect(404);
    });
  });

  describe('GET /screening/api/results/:id', () => {
    let screeningId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/screening')
        .send({
          jobTitle: 'API Test Developer',
          requiredSkills: ['JavaScript', 'React'],
          minExp: 2,
          maxExp: 6
        });

      screeningId = response.body.screeningId;
    });

    it('should return screening results as JSON', async () => {
      const response = await request(app)
        .get(`/screening/api/results/${screeningId}`)
        .expect(200);

      expect(response.body.jobTitle).toBe('API Test Developer');
      expect(response.body.requiredSkills).toEqual(['JavaScript', 'React']);
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('GET /screening/all', () => {
    beforeEach(async () => {
      // Create multiple screenings
      await request(app)
        .post('/screening')
        .send({
          jobTitle: 'Frontend Developer',
          requiredSkills: ['JavaScript', 'React']
        });

      await request(app)
        .post('/screening')
        .send({
          jobTitle: 'Backend Developer',
          requiredSkills: ['Python', 'Django']
        });
    });

    it('should list all screenings', async () => {
      const response = await request(app)
        .get('/screening/all')
        .expect(200);

      expect(response.text).toContain('All Screenings');
      expect(response.text).toContain('Frontend Developer');
      expect(response.text).toContain('Backend Developer');
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
      const nonExistentId = new require('mongoose').Types.ObjectId();
      
      const response = await request(app)
        .delete(`/screening/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /screening/api/stats', () => {
    beforeEach(async () => {
      // Create screening for stats
      await request(app)
        .post('/screening')
        .send({
          jobTitle: 'Stats Test',
          requiredSkills: ['JavaScript']
        });
    });

    it('should return screening statistics', async () => {
      const response = await request(app)
        .get('/screening/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics.totalScreenings).toBeGreaterThan(0);
      expect(response.body.statistics.averageScore).toBeDefined();
      expect(response.body.statistics.totalCandidates).toBeDefined();
    });
  });

  describe('Complex Screening Scenarios', () => {
    it('should handle screening with no skill matches', async () => {
      const response = await request(app)
        .post('/screening')
        .send({
          jobTitle: 'Rare Skills Developer',
          requiredSkills: ['Rust', 'WebAssembly', 'Quantum Computing'],
          minExp: 10,
          maxExp: 20
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.statistics.qualifiedCandidates).toBe(0);
    });

    it('should prioritize candidates correctly', async () => {
      const response = await request(app)
        .post('/screening')
        .send({
          jobTitle: 'JavaScript Developer',
          requiredSkills: ['JavaScript'],
          minExp: 0,
          maxExp: 10
        });

      const screening = await Screening.findById(response.body.screeningId);
      const results = screening.results.sort((a, b) => b.matchScore - a.matchScore);

      // JavaScript Developer should be ranked highest
      expect(results[0].candidateName).toBe('JavaScript Developer');
    });
  });
});
