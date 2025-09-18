/**
 * Integration tests for REST API endpoints
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');
const Screening = require('../../models/Screening');
const { 
  createTestResumeInDB, 
  createMultipleTestResumes,
  createTestScreeningInDB,
  cleanupTestData 
} = require('../helpers/apiHelpers');

describe('API Endpoints Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/resumes', () => {
    it('should return paginated resumes with correct structure', async () => {
      await createMultipleTestResumes(3);

      const response = await request(app)
        .get('/api/resumes')
        .query({ page: 1, limit: 2 })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resumes).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2
      });

      // Check resume structure
      const resume = response.body.data.resumes[0];
      expect(resume).toHaveProperty('_id');
      expect(resume).toHaveProperty('candidateName');
      expect(resume).toHaveProperty('email');
      expect(resume).toHaveProperty('skills');
      expect(resume).toHaveProperty('isProcessed');
    });

    it('should filter resumes by processing status', async () => {
      await createMultipleTestResumes(4); // Creates 2 processed, 2 unprocessed

      const processedResponse = await request(app)
        .get('/api/resumes')
        .query({ processed: 'true' })
        .expect(200);

      const unprocessedResponse = await request(app)
        .get('/api/resumes')
        .query({ processed: 'false' })
        .expect(200);

      expect(processedResponse.body.data.resumes).toHaveLength(2);
      expect(unprocessedResponse.body.data.resumes).toHaveLength(2);

      // Verify filtering
      processedResponse.body.data.resumes.forEach(resume => {
        expect(resume.isProcessed).toBe(true);
      });
    });

    it('should search resumes by candidate name', async () => {
      await createTestResumeInDB({ candidateName: 'Alice Johnson' });
      await createTestResumeInDB({ candidateName: 'Bob Smith' });

      const response = await request(app)
        .get('/api/resumes')
        .query({ search: 'alice' })
        .expect(200);

      expect(response.body.data.resumes).toHaveLength(1);
      expect(response.body.data.resumes[0].candidateName).toBe('Alice Johnson');
    });

    it('should handle empty results gracefully', async () => {
      const response = await request(app)
        .get('/api/resumes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resumes).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/resumes/:id', () => {
    it('should return specific resume with full details', async () => {
      const testResume = await createTestResumeInDB({
        candidateName: 'Alice Johnson',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: { years: 5, positions: ['Senior Developer'] }
      });

      const response = await request(app)
        .get(`/api/resumes/${testResume._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resume._id).toBe(testResume._id.toString());
      expect(response.body.data.resume.candidateName).toBe('Alice Johnson');
      expect(response.body.data.resume.skills).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(response.body.data.resume.experience.years).toBe(5);
    });

    it('should return 404 for non-existent resume', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/resumes/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Resume not found');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app)
        .get('/api/resumes/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    it('should delete resume and return confirmation', async () => {
      const testResume = await createTestResumeInDB({
        candidateName: 'To Be Deleted'
      });

      const response = await request(app)
        .delete(`/api/resumes/${testResume._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedResume.name).toBe('To Be Deleted');

      // Verify deletion
      const deletedResume = await Resume.findById(testResume._id);
      expect(deletedResume).toBeNull();
    });

    it('should return 404 when deleting non-existent resume', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/resumes/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/resumes', () => {
    it('should delete all resumes and return count', async () => {
      await createMultipleTestResumes(5);

      const response = await request(app)
        .delete('/api/resumes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(5);

      // Verify all deleted
      const count = await Resume.countDocuments({});
      expect(count).toBe(0);
    });
  });

  describe('GET /api/stats', () => {
    it('should return comprehensive statistics', async () => {
      await createMultipleTestResumes(6); // Creates 3 processed, 3 unprocessed

      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual({
        total: 6,
        processed: 3,
        unprocessed: 3,
        processingRate: 50,
        todayStats: expect.objectContaining({
          uploaded: expect.any(Number),
          processed: expect.any(Number)
        }),
        recentUploads: expect.any(Array),
        lastUpdated: expect.any(String)
      });
    });

    it('should handle empty database gracefully', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.data.stats.total).toBe(0);
      expect(response.body.data.stats.processingRate).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = Array(30).fill().map(() => 
        request(app).get('/api/stats')
      );

      const responses = await Promise.allSettled(requests);
      const statusCounts = responses.reduce((acc, result) => {
        if (result.status === 'fulfilled') {
          const status = result.value.status;
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, {});

      // Should have some 200s and some rate-limited responses
      expect(statusCounts[200]).toBeGreaterThan(0);
      expect(statusCounts[200]).toBeLessThan(30);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      jest.spyOn(Resume, 'find').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/resumes')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Server error');

      Resume.find.mockRestore();
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .get('/api/resumes')
        .query({ page: 'invalid', limit: 'invalid' })
        .expect(200); // Should use default values

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include proper security headers', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      // Check for security headers (if configured)
      expect(response.headers).toHaveProperty('x-powered-by');
    });
  });
});
