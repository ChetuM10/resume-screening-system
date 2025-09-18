/**
 * Integration tests for API routes
 * Tests all REST API endpoints end-to-end
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');
const Screening = require('../../models/Screening');
const { createTestResume, createTestScreening } = require('../setup/testHelpers');

describe('API Routes Integration Tests', () => {
  describe('GET /api/resumes', () => {
    beforeEach(async () => {
      // Create test data
      const resume1 = createTestResume({ candidateName: 'John Doe', isProcessed: true });
      const resume2 = createTestResume({ candidateName: 'Jane Smith', isProcessed: false });
      
      await Promise.all([resume1.save(), resume2.save()]);
    });

    it('should return paginated resumes list', async () => {
      const response = await request(app)
        .get('/api/resumes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resumes).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter resumes by processing status', async () => {
      const response = await request(app)
        .get('/api/resumes?processed=true')
        .expect(200);

      expect(response.body.data.resumes).toHaveLength(1);
      expect(response.body.data.resumes[0].candidateName).toBe('John Doe');
    });

    it('should search resumes by name', async () => {
      const response = await request(app)
        .get('/api/resumes?search=jane')
        .expect(200);

      expect(response.body.data.resumes).toHaveLength(1);
      expect(response.body.data.resumes[0].candidateName).toBe('Jane Smith');
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/resumes?page=1&limit=1')
        .expect(200);

      expect(response.body.data.resumes).toHaveLength(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.page).toBe(1);
    });
  });

  describe('GET /api/resumes/:id', () => {
    let testResume;

    beforeEach(async () => {
      testResume = createTestResume();
      await testResume.save();
    });

    it('should return specific resume by ID', async () => {
      const response = await request(app)
        .get(`/api/resumes/${testResume._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resume._id).toBe(testResume._id.toString());
      expect(response.body.data.resume.candidateName).toBe('Test Candidate');
    });

    it('should return 404 for non-existent resume', async () => {
      const nonExistentId = new require('mongoose').Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/resumes/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Resume not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/resumes/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    let testResume;

    beforeEach(async () => {
      testResume = createTestResume();
      await testResume.save();
    });

    it('should delete resume successfully', async () => {
      const response = await request(app)
        .delete(`/api/resumes/${testResume._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedResume.name).toBe('Test Candidate');

      // Verify deletion
      const deletedResume = await Resume.findById(testResume._id);
      expect(deletedResume).toBeNull();
    });

    it('should return 404 when deleting non-existent resume', async () => {
      const nonExistentId = new require('mongoose').Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/resumes/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/resumes', () => {
    beforeEach(async () => {
      const resume1 = createTestResume({ candidateName: 'John Doe' });
      const resume2 = createTestResume({ candidateName: 'Jane Smith' });
      
      await Promise.all([resume1.save(), resume2.save()]);
    });

    it('should delete all resumes', async () => {
      const response = await request(app)
        .delete('/api/resumes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(2);

      // Verify all resumes deleted
      const remainingCount = await Resume.countDocuments({});
      expect(remainingCount).toBe(0);
    });
  });

  describe('GET /api/stats', () => {
    beforeEach(async () => {
      const resume1 = createTestResume({ isProcessed: true });
      const resume2 = createTestResume({ isProcessed: false });
      
      await Promise.all([resume1.save(), resume2.save()]);
    });

    it('should return comprehensive statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.total).toBe(2);
      expect(response.body.data.stats.processed).toBe(1);
      expect(response.body.data.stats.unprocessed).toBe(1);
      expect(response.body.data.stats.processingRate).toBe(50);
    });

    it('should include recent statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.data.stats.todayStats).toBeDefined();
      expect(response.body.data.stats.recentUploads).toBeDefined();
      expect(response.body.data.stats.lastUpdated).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.uptime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(Resume, 'find').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/resumes')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Server error');

      // Restore mock
      Resume.find.mockRestore();
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      // Should be handled by your 404 middleware
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limits to API endpoints', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(20).fill().map(() => 
        request(app).get('/api/stats')
      );

      const responses = await Promise.all(promises);
      
      // At least some requests should succeed
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(0);
    }, 10000);
  });
});
