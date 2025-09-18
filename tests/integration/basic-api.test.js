/**
 * Basic integration tests to verify setup
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');

describe('Basic API Integration Tests', () => {
  beforeEach(async () => {
    await Resume.deleteMany({});
  });

  afterAll(async () => {
    await Resume.deleteMany({});
  });

  describe('Server Health Check', () => {
    it('should respond to basic requests', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toBeDefined();
    });
  });

  describe('API Endpoints', () => {
    it('should return stats endpoint', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.total).toBe(0);
    });

    it('should return empty resumes list', async () => {
      const response = await request(app)
        .get('/api/resumes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resumes).toHaveLength(0);
    });
  });

  describe('Database Integration', () => {
    it('should create and retrieve resume', async () => {
      // Create resume directly in database
      const testResume = new Resume({
        candidateName: 'Test User',
        email: 'unique@test.com',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        extractedText: 'Test content',
        isProcessed: true
      });
      
      await testResume.save();

      // Test API retrieval
      const response = await request(app)
        .get('/api/resumes')
        .expect(200);

      expect(response.body.data.resumes).toHaveLength(1);
      expect(response.body.data.resumes[0].candidateName).toBe('Test User');
    });
  });
});
