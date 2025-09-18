/**
 * @fileoverview FIXED Upload Controller - Enhanced Error Handling
 * @version 3.1.0 - Fixed NLP integration
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');
const fileProcessor = require('../services/fileProcessor');
const nlpService = require('../services/nlpService'); // ✅ FIXED: Use nlpService instead of skillExtractor

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
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `resume-${timestamp}-${randomSuffix}-${sanitizedName}`;
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

// ==================== ENHANCED PROCESSING FUNCTION ====================

async function processFile(file) {
  try {
    console.log(`🔄 FIXED: Processing file: ${file.originalname}`);
    
    // Step 1: Extract text from file
    const extractedText = await fileProcessor.extractTextFromFile(file);
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('Failed to extract meaningful text from file - text too short or empty');
    }

    console.log(`📝 Extracted text length: ${extractedText.length} characters`);
    console.log(`📝 Sample text: "${extractedText.substring(0, 200)}..."`);

    // Step 2: ✅ FIXED: Use nlpService for processing
    const nlpResult = await nlpService.processResumeText(extractedText);
    
    console.log(`🧠 NLP Result:`, {
      name: nlpResult.name,
      email: nlpResult.email,
      phone: nlpResult.phone,
      skillsCount: nlpResult.skills?.length || 0,
      experience: nlpResult.experience?.years || 0,
      confidence: nlpResult.confidence
    });

    // Step 3: ✅ FIXED: Determine candidate name with better fallback
    let candidateName = nlpResult.name;
    if (!candidateName || candidateName === 'Unknown Candidate' || candidateName.trim() === '') {
      // Try to get name from filename
      const fileBaseName = path.basename(file.originalname, path.extname(file.originalname));
      const cleanedFileName = fileBaseName
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/resume|cv|curriculum/gi, '')
        .trim();
      
      if (cleanedFileName.length > 2 && cleanedFileName.length < 50 && 
          !cleanedFileName.match(/^\d+$/) && // Not just numbers
          cleanedFileName.match(/^[a-zA-Z\s.]+$/)) { // Only letters, spaces, dots
        candidateName = cleanedFileName;
      } else {
        candidateName = 'Unknown Candidate';
      }
    }

    // Step 4: Create resume data object
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

    // Step 5: Save to database
    const resume = new Resume(resumeData);
    const savedResume = await resume.save();

    console.log(`✅ FIXED: File processed and saved: ${file.originalname} -> ${savedResume._id}`);
    console.log(`📊 Final data: Name="${candidateName}", Skills=${nlpResult.skills?.length || 0}, Email="${nlpResult.email || 'none'}"`);

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
    console.error(`❌ FIXED: Error processing file ${file.originalname}:`, error);
    
    // Clean up file on error
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Cleaned up failed file: ${file.path}`);
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

// ==================== KEEP EXISTING CONTROLLER FUNCTIONS ====================

const uploadResumes = async (req, res, next) => {
  try {
    console.log(`🔄 FIXED: Processing ${req.files?.length || 0} uploaded files`);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    // Process all files
    const processingPromises = req.files.map(file => processFile(file));
    const results = await Promise.all(processingPromises);

    // Calculate statistics
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ FIXED: Bulk upload complete: ${successful.length} successful, ${failed.length} failed`);

    // Determine response status
    const statusCode = failed.length === 0 ? 200 : (successful.length === 0 ? 400 : 207);

    res.status(statusCode).json({
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
    console.error('❌ FIXED: Bulk upload processing error:', error);
    next(error);
  }
};

// Keep all other existing functions unchanged
const uploadResume = async (req, res, next) => {
  try {
    console.log('🔄 FIXED: Processing single file upload');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    // Process single file
    const result = await processFile(req.file);

    if (result.success) {
      console.log(`✅ FIXED: Single file processed: ${req.file.originalname}`);

      res.json({
        success: true,
        message: 'Resume uploaded and processed successfully',
        candidate: {
          id: result.resumeId,
          name: result.candidateName,
          email: result.email,
          phone: result.phone,
          skills: result.skills,
          skillsCount: result.skillsCount,
          experience: result.experience,
          confidence: result.confidence
        },
        file: {
          filename: result.filename,
          originalName: result.originalName,
          size: result.fileSize
        },
        timestamp: result.processingTime
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'File processing failed',
        details: result.error,
        code: result.errorCode
      });
    }

  } catch (error) {
    console.error('❌ FIXED: Single file processing error:', error);
    next(error);
  }
};

const getUploadInfo = async (req, res) => {
  try {
    // Get database statistics
    const totalResumes = await Resume.countDocuments();
    const processedResumes = await Resume.countDocuments({ isProcessed: true });
    const recentUploads = await Resume.countDocuments({
      uploadDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get file system statistics
    let uploadedFilesCount = 0;
    let totalFileSize = 0;
    
    try {
      const files = fs.readdirSync(UPLOAD_DIR);
      uploadedFilesCount = files.length;
      
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file);
        const stats = fs.statSync(filePath);
        totalFileSize += stats.size;
      }
    } catch (fsError) {
      console.error('Error reading upload directory:', fsError);
    }

    // Get skill statistics
    const skillStats = await Resume.aggregate([
      { $match: { isProcessed: true } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      config: {
        maxFileSize: 10 * 1024 * 1024,
        maxFileSizeMB: 10,
        maxFilesPerRequest: 20,
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        supportedExtensions: ['.pdf', '.doc', '.docx'],
        uploadDirectory: UPLOAD_DIR
      },
      statistics: {
        totalResumes: totalResumes,
        processedResumes: processedResumes,
        processingRate: totalResumes > 0 ? Math.round((processedResumes / totalResumes) * 100) : 0,
        recentUploads: recentUploads,
        filesOnDisk: uploadedFilesCount,
        totalFileSize: totalFileSize,
        totalFileSizeMB: Math.round(totalFileSize / (1024 * 1024) * 100) / 100,
        topSkills: skillStats.map(skill => ({
          name: skill._id,
          count: skill.count
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching upload info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upload information',
      details: error.message
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  upload,
  uploadResumes,
  uploadResume,
  getUploadInfo
};
