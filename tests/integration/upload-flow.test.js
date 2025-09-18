/**
 * Integration tests for complete file upload workflow
 */
const request = require('supertest');
const app = require('../../server');
const Resume = require('../../models/Resume');
const { createMockPDF, createMockDOCX, SAMPLE_FILES } = require('../fixtures/sampleFiles');
const { cleanupTestData } = require('../helpers/apiHelpers');

describe('Upload Flow Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /upload', () => {
    it('should render upload page with correct statistics', async () => {
      // Create test data
      await Resume.create([
        {
          candidateName: 'Processed User',
          filename: 'processed.pdf',
          originalName: 'processed.pdf',
          extractedText: 'content',
          isProcessed: true
        },
        {
          candidateName: 'Unprocessed User',
          filename: 'unprocessed.pdf', 
          originalName: 'unprocessed.pdf',
          extractedText: 'content',
          isProcessed: false
        }
      ]);

      const response = await request(app)
        .get('/upload')
        .expect(200);

      // Check page content
      expect(response.text).toContain('Upload Resume');
      expect(response.text).toContain('2 total'); // Total resumes
      expect(response.text).toContain('1 processed'); // Processed count
      expect(response.text).toContain('50%'); // Processing rate
    });

    it('should show empty state when no resumes exist', async () => {
      const response = await request(app)
        .get('/upload')
        .expect(200);

      expect(response.text).toContain('0 total');
      expect(response.text).toContain('0 processed');
    });
  });

  describe('POST /upload - File Upload', () => {
    it('should successfully upload a valid PDF file', async () => {
      const mockPDF = createMockPDF();

      const response = await request(app)
        .post('/upload')
        .attach('resume', mockPDF, {
          filename: SAMPLE_FILES.validPDF.originalName,
          contentType: SAMPLE_FILES.validPDF.mimetype
        })
        .expect(302); // Redirect after upload

      // Check redirect to success page
      expect(response.headers.location).toMatch(/\/upload\?success=true/);

      // Verify database entry
      const savedResume = await Resume.findOne({ 
        originalName: SAMPLE_FILES.validPDF.originalName 
      });
      
      expect(savedResume).toBeDefined();
      expect(savedResume.candidateName).toBeDefined();
      expect(savedResume.filename).toContain('.pdf');
      expect(savedResume.isProcessed).toBe(false); // Initially unprocessed
      expect(savedResume.uploadDate).toBeInstanceOf(Date);
    });

    it('should successfully upload a valid DOCX file', async () => {
      const mockDOCX = createMockDOCX();

      const response = await request(app)
        .post('/upload')
        .attach('resume', mockDOCX, {
          filename: SAMPLE_FILES.validDOCX.originalName,
          contentType: SAMPLE_FILES.validDOCX.mimetype
        })
        .expect(302);

      expect(response.headers.location).toMatch(/success=true/);

      const savedResume = await Resume.findOne({ 
        originalName: SAMPLE_FILES.validDOCX.originalName 
      });
      expect(savedResume).toBeDefined();
      expect(savedResume.filename).toContain('.docx');
    });

    it('should reject invalid file types', async () => {
      const textFile = Buffer.from('This is just text, not a resume');

      const response = await request(app)
        .post('/upload')
        .attach('resume', textFile, {
          filename: SAMPLE_FILES.invalidFile.originalName,
          contentType: SAMPLE_FILES.invalidFile.mimetype
        })
        .expect(302);

      // Should redirect with error
      expect(response.headers.location).toMatch(/error=/);
      
      // Verify no database entry created
      const count = await Resume.countDocuments({});
      expect(count).toBe(0);
    });

    it('should reject files exceeding size limit', async () => {
      // Create large file buffer (>10MB)
      const largeFile = Buffer.alloc(12 * 1024 * 1024, 'a');

      const response = await request(app)
        .post('/upload')
        .attach('resume', largeFile, {
          filename: SAMPLE_FILES.largeFile.originalName,
          contentType: SAMPLE_FILES.largeFile.mimetype
        })
        .expect(302);

      expect(response.headers.location).toMatch(/error=/);
      
      const count = await Resume.countDocuments({});
      expect(count).toBe(0);
    });

    it('should handle missing file gracefully', async () => {
      const response = await request(app)
        .post('/upload')
        .expect(302);

      expect(response.headers.location).toMatch(/error=/);
    });

    it('should handle multiple file uploads', async () => {
      const mockPDF1 = createMockPDF();
      const mockPDF2 = createMockPDF();

      // Upload first file
      await request(app)
        .post('/upload')
        .attach('resume', mockPDF1, {
          filename: 'resume1.pdf',
          contentType: 'application/pdf'
        })
        .expect(302);

      // Upload second file
      await request(app)
        .post('/upload')
        .attach('resume', mockPDF2, {
          filename: 'resume2.pdf',
          contentType: 'application/pdf'
        })
        .expect(302);

      // Verify both files in database
      const count = await Resume.countDocuments({});
      expect(count).toBe(2);
    });
  });

  describe('GET /upload/info', () => {
    it('should return upload configuration and statistics', async () => {
      await Resume.create({
        candidateName: 'Test',
        filename: 'test.pdf',
        originalName: 'test.pdf', 
        extractedText: 'content',
        isProcessed: true
      });

      const response = await request(app)
        .get('/upload/info')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.config).toEqual({
        maxFileSizeMB: 10,
        allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxFiles: 1
      });
      expect(response.body.statistics.totalResumes).toBe(1);
      expect(response.body.statistics.processedResumes).toBe(1);
      expect(response.body.statistics.processingRate).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during upload', async () => {
      // Mock database error
      jest.spyOn(Resume.prototype, 'save').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const mockPDF = createMockPDF();

      const response = await request(app)
        .post('/upload')
        .attach('resume', mockPDF, {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .expect(302);

      expect(response.headers.location).toMatch(/error=/);

      Resume.prototype.save.mockRestore();
    });
  });
});
