/**
 * Integration tests for upload routes
 */
const request = require('supertest');
const app = require('../../server'); // Import your Express app
const Resume = require('../../models/Resume');

describe('Upload Routes', () => {
  describe('GET /upload', () => {
    it('should render upload page', async () => {
      const response = await request(app)
        .get('/upload')
        .expect(200);

      expect(response.text).toContain('Upload Resumes');
    });
  });

  describe('GET /upload/info', () => {
    it('should return upload configuration', async () => {
      const response = await request(app)
        .get('/upload/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.maxFileSizeMB).toBe(10);
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    it('should count resumes correctly', async () => {
      // Create test resumes
      const resume1 = new Resume({
        candidateName: 'Test User 1',
        extractedText: 'Test content 1',
        isProcessed: true
      });
      const resume2 = new Resume({
        candidateName: 'Test User 2',
        extractedText: 'Test content 2',
        isProcessed: false
      });

      await Promise.all([resume1.save(), resume2.save()]);

      const response = await request(app)
        .get('/upload/info')
        .expect(200);

      expect(response.body.statistics.totalResumes).toBe(2);
      expect(response.body.statistics.processedResumes).toBe(1);
      expect(response.body.statistics.processingRate).toBe(50);
    });
  });
});
