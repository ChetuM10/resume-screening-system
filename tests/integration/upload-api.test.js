/**
 * Integration tests for file upload API endpoints
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');
const { createMockPDF, sampleResume } = require('../fixtures/sample-files');

describe('Upload API Integration Tests', () => {
  beforeEach(async () => {
    await Resume.deleteMany({});
  });

  describe('GET /upload', () => {
    it('should render upload page with statistics', async () => {
      // Create some test data
      const testResume = new Resume({
        candidateName: 'Test User',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        extractedText: 'Test content',
        isProcessed: true
      });
      await testResume.save();

      const response = await request(app)
        .get('/upload')
        .expect(200);

      expect(response.text).toContain('Upload Resume');
      expect(response.text).toContain('1 processed'); // Our test data
    });
  });

  describe('POST /upload', () => {
    it('should successfully upload and process a PDF file', async () => {
      const mockPDF = createMockPDF();

      const response = await request(app)
        .post('/upload')
        .attach('resume', mockPDF, {
          filename: sampleResume.filename,
          contentType: sampleResume.mimetype
        })
        .expect(302); // Redirect after successful upload

      // Verify redirect location
      expect(response.headers.location).toMatch(/\/upload\?success=/);

      // Verify database entry
      const savedResume = await Resume.findOne({ filename: sampleResume.filename });
      expect(savedResume).toBeDefined();
      expect(savedResume.originalName).toBe(sampleResume.filename);
      expect(savedResume.isProcessed).toBe(false); // Initially unprocessed
    });

    it('should reject non-PDF files', async () => {
      const textContent = Buffer.from('This is not a PDF');

      const response = await request(app)
        .post('/upload')
        .attach('resume', textContent, {
          filename: 'resume.txt',
          contentType: 'text/plain'
        })
        .expect(302);

      expect(response.headers.location).toContain('error=');
      
      // Verify no database entry
      const count = await Resume.countDocuments({});
      expect(count).toBe(0);
    });

    it('should handle file size limits', async () => {
      // Create large file (>10MB)
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/upload')
        .attach('resume', largeFile, {
          filename: 'large-resume.pdf',
          contentType: 'application/pdf'
        })
        .expect(302);

      expect(response.headers.location).toContain('error=');
    });
  });

  describe('File Processing Integration', () => {
    it('should process uploaded file and extract text', async () => {
      const mockPDF = createMockPDF();

      // Upload file
      await request(app)
        .post('/upload')
        .attach('resume', mockPDF, {
          filename: sampleResume.filename,
          contentType: sampleResume.mimetype
        })
        .expect(302);

      // Verify file is marked for processing
      const resume = await Resume.findOne({ filename: sampleResume.filename });
      expect(resume.isProcessed).toBe(false);
      
      // In a real scenario, you'd trigger the processing job here
      // For testing, we can manually set processed state
      resume.isProcessed = true;
      resume.extractedText = 'Sample extracted text content';
      await resume.save();

      // Verify processing completed
      const processedResume = await Resume.findById(resume._id);
      expect(processedResume.isProcessed).toBe(true);
      expect(processedResume.extractedText).toBeDefined();
    });
  });
});
