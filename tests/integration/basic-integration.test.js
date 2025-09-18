/**
 * Basic integration tests to verify setup works
 */
const request = require('supertest');
const app = require('../../server');
const { cleanupTestData, createTestResumeInDB } = require('../helpers/apiHelpers');

describe('Basic Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Server Health Check', () => {
    it('should respond to home page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toBeDefined();
    });

    it('should respond to API stats', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    it('should create and retrieve resume via API', async () => {
      // Create test resume
      await createTestResumeInDB({
        candidateName: 'Integration Test User'
      });

      // Test API retrieval
      const response = await request(app)
        .get('/api/resumes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resumes).toHaveLength(1);
      expect(response.body.data.resumes[0].candidateName).toBe('Integration Test User');
    });
  });
});
