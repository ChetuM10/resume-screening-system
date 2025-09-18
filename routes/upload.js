/**
 * @fileoverview FIXED Upload Routes - Now with proper resume processing
 * @version 3.0.0 - Integrated with resume processing pipeline
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume'); // Adjust path as needed
const router = express.Router();

// Import your processing services
let fileProcessor, nlpService;
try {
  fileProcessor = require('../services/fileProcessor');
  nlpService = require('../services/nlpService');
} catch (e) {
  console.error('❌ Missing required services:', e.message);
  console.log('Please ensure fileProcessor.js and nlpService.js exist');
}

// ==================== MULTER CONFIGURATION ====================

const UPLOAD_DIR = './uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`✅ Created upload directory: ${UPLOAD_DIR}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `resume-${timestamp}-${randomSuffix}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log(`📁 Processing file: ${file.originalname} (${file.mimetype})`);
  
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error('Only PDF and DOCX files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 files
  },
  fileFilter: fileFilter
});

// ==================== FIXED PROCESSING FUNCTION ====================

async function processFile(file) {
  try {
    console.log(`🔄 PROCESSING FILE: ${file.originalname}`);
    
    // Step 1: Check if services are available
    if (!fileProcessor || !nlpService) {
      throw new Error('File processing services not available');
    }

    // Step 2: Extract text from file
    console.log(`📄 Extracting text from: ${file.path}`);
    const extractedText = await fileProcessor.extractTextFromFile(file);
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('Failed to extract meaningful text from file');
    }

    console.log(`📝 Extracted ${extractedText.length} characters`);
    console.log(`📝 Sample: "${extractedText.substring(0, 200)}..."`);

    // Step 3: Process with NLP
    console.log(`🧠 Processing text with NLP...`);
    const nlpResult = await nlpService.processResumeText(extractedText);
    
    console.log(`🔍 NLP Results:`, {
      name: nlpResult.name,
      email: nlpResult.email,
      phone: nlpResult.phone,
      skillsCount: nlpResult.skills?.length || 0,
      experience: nlpResult.experience?.years || 0
    });

    // Step 4: Determine candidate name
    let candidateName = nlpResult.name;
    if (!candidateName || candidateName === 'Unknown Candidate') {
      const fileBaseName = path.basename(file.originalname, path.extname(file.originalname));
      const cleanedFileName = fileBaseName
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/resume|cv|curriculum/gi, '')
        .trim();
      
      if (cleanedFileName.length > 2 && cleanedFileName.length < 50 && 
          !cleanedFileName.match(/^\d+$/) && 
          cleanedFileName.match(/^[a-zA-Z\s.]+$/)) {
        candidateName = cleanedFileName;
      } else {
        candidateName = 'Unknown Candidate';
      }
    }

    // Step 5: Create resume data
    const resumeData = {
      candidateName: candidateName,
      email: nlpResult.email || '',
      phone: nlpResult.phone || '',
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      extractedText: extractedText,
      skills: nlpResult.skills || [],
      education: {
        degree: nlpResult.education || 'Not Specified',
        institution: '',
        year: null
      },
      experience: {
        years: nlpResult.experience?.years || 0,
        positions: nlpResult.experience?.positions || []
      },
      isProcessed: true,
      confidence: nlpResult.confidence || 50,
      processingErrors: [],
      uploadDate: new Date(),
      processedAt: new Date()
    };

    // Step 6: Save to database
    console.log(`💾 Saving to database...`);
    const resume = new Resume(resumeData);
    const savedResume = await resume.save();

    console.log(`✅ SUCCESSFULLY PROCESSED: ${file.originalname}`);
    console.log(`📊 Final: Name="${candidateName}", Skills=${nlpResult.skills?.length || 0}, Email="${nlpResult.email || 'none'}"`);

    return {
      success: true,
      resumeId: savedResume._id,
      filename: file.filename,
      originalName: file.originalname,
      candidateName: candidateName,
      email: nlpResult.email,
      phone: nlpResult.phone,
      skills: nlpResult.skills || [],
      skillsCount: (nlpResult.skills || []).length,
      experience: nlpResult.experience?.years || 0,
      confidence: nlpResult.confidence || 50,
      fileSize: file.size,
      processingTime: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ ERROR PROCESSING ${file.originalname}:`, error);
    
    // Clean up file on error
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    return {
      success: false,
      filename: file.originalname,
      error: error.message,
      errorCode: error.code || 'PROCESSING_ERROR'
    };
  }
}

// ==================== ROUTE HANDLERS ====================

/**
 * GET route to render upload form page
 */
router.get('/', async (req, res) => {
  try {
    // Get database statistics
    const totalResumes = await Resume.countDocuments();
    const processedResumes = await Resume.countDocuments({ isProcessed: true });
    
    res.render('pages/upload', {
      title: 'Upload Resumes',
      maxFiles: 20,
      maxFileSize: 10,
      supportedFormats: ['PDF', 'DOCX'],
      statistics: {
        totalResumes: totalResumes,
        processedResumes: processedResumes,
        processingRate: totalResumes > 0 ? Math.round((processedResumes / totalResumes) * 100) : 0
      },
      success: req.query.success,
      error: req.query.error,
      message: req.query.message,
      processed: req.query.processed,
      failed: req.query.failed
    });
  } catch (error) {
    console.error('Error rendering upload page:', error);
    res.render('pages/upload', {
      title: 'Upload Resumes',
      error: 'Failed to load statistics'
    });
  }
});

/**
 * POST route to handle multiple file uploads with FULL PROCESSING
 */
router.post('/',
  upload.array('resumes', 20),
  async (req, res, next) => {
    try {
      console.log(`🔄 PROCESSING ${req.files?.length || 0} uploaded files`);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
          code: 'NO_FILES'
        });
      }

      // Process all files with actual resume processing
      const processingPromises = req.files.map(file => processFile(file));
      const results = await Promise.all(processingPromises);

      // Calculate statistics
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`✅ UPLOAD COMPLETE: ${successful.length} successful, ${failed.length} failed`);

      // Return response
      res.json({
        success: failed.length === 0,
        message: `Processed ${successful.length} of ${req.files.length} files successfully`,
        summary: {
          total: req.files.length,
          successful: successful.length,
          failed: failed.length,
          successfulResumes: successful.map(r => ({
            id: r.resumeId,
            name: r.candidateName,
            email: r.email,
            skills: r.skills,
            skillsCount: r.skillsCount,
            experience: r.experience,
            confidence: r.confidence
          }))
        },
        results: results,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Upload processing error:', error);
      next(error);
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ Upload route error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 10MB',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        error: 'Too many files. Maximum is 20 files',
        code: 'TOO_MANY_FILES'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: 'Upload processing failed',
    details: error.message
  });
});

module.exports = router;
