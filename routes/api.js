/**
 * @fileoverview API Routes - RESTful API endpoints for external integrations
 * Provides CRUD operations for resumes, screenings, and system statistics
 * @author Resume Screening System
 * @version 1.0.0
 */

const express = require('express');
const Resume = require('../models/Resume');
const resultsController = require('../controllers/resultsController');

const router = express.Router();

// ==================== CONFIGURATION CONSTANTS ====================

/**
 * API configuration constants
 * @type {Object}
 */
const API_CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 1000,
  MONGODB_OBJECTID_REGEX: /^[0-9a-fA-F]{24}$/
};

/**
 * Standard API response codes
 * @type {Object}
 */
const RESPONSE_CODES = {
  SUCCESS: 'SUCCESS',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_ID: 'INVALID_ID',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validates MongoDB ObjectId format
 * @param {string} id - ID string to validate
 * @returns {boolean} True if valid ObjectId format
 */
function isValidObjectId(id) {
  return API_CONFIG.MONGODB_OBJECTID_REGEX.test(id);
}

/**
 * Creates standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {Object} data - Response data
 * @param {string} code - Response code
 * @returns {Object} Standardized API response
 */
function createApiResponse(success, message, data = null, code = null) {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) response.data = data;
  if (code) response.code = code;

  return response;
}

/**
 * Logs API operations for monitoring and debugging
 * @param {string} operation - Operation being performed
 * @param {string} details - Additional details
 * @param {string} level - Log level (info, error, warn)
 */
function logApiOperation(operation, details = '', level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] API ${operation}: ${details}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

// ==================== RESUME MANAGEMENT ROUTES ====================

/**
 * GET all resumes with pagination and filtering
 * Retrieves paginated list of resumes with optional filtering
 * @route GET /api/resumes
 * @param {Object} req - Express request object
 * @param {number} [req.query.page=1] - Page number for pagination
 * @param {number} [req.query.limit=50] - Number of results per page
 * @param {string} [req.query.processed] - Filter by processing status ('true', 'false')
 * @param {string} [req.query.search] - Search term for candidate names or emails
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with resumes list
 * @example
 * GET /api/resumes?page=1&limit=20&processed=true&search=john
 * Response: {
 *   "success": true,
 *   "data": {
 *     "resumes": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 150,
 *       "pages": 8
 *     }
 *   }
 * }
 */
router.get('/resumes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || API_CONFIG.DEFAULT_LIMIT, API_CONFIG.MAX_LIMIT);
    const skip = (page - 1) * limit;
    
    // Build query filters
    const query = {};
    if (req.query.processed === 'true') query.isProcessed = true;
    if (req.query.processed === 'false') query.isProcessed = false;
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { candidateName: searchRegex },
        { email: searchRegex }
      ];
    }

    logApiOperation('resumes list', `page=${page}, limit=${limit}, filters=${JSON.stringify(query)}`);

    // Execute query with pagination
    const [resumes, totalCount] = await Promise.all([
      Resume.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-extractedText') // Exclude large text field for performance
        .lean(),
      Resume.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json(createApiResponse(true, 'Resumes retrieved successfully', {
      resumes,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }));

  } catch (error) {
    logApiOperation('resumes list', error.message, 'error');
    
    res.status(500).json(createApiResponse(
      false,
      'Server error fetching resumes',
      null,
      RESPONSE_CODES.SERVER_ERROR
    ));
  }
});

/**
 * GET single resume by ID
 * Retrieves detailed information for a specific resume
 * @route GET /api/resumes/:id
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resume document ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with resume details
 * @example
 * GET /api/resumes/64a7b8c9d1234567890abcde
 * Response: {
 *   "success": true,
 *   "data": {
 *     "resume": {
 *       "id": "...",
 *       "candidateName": "John Doe",
 *       "email": "john@example.com",
 *       "skills": [...],
 *       "experience": {...}
 *     }
 *   }
 * }
 */
router.get('/resumes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json(createApiResponse(
        false,
        'Invalid resume ID format',
        null,
        RESPONSE_CODES.INVALID_ID
      ));
    }

    logApiOperation('resume detail', `fetching resume ${id}`);

    const resume = await Resume.findById(id).lean();

    if (!resume) {
      return res.status(404).json(createApiResponse(
        false,
        'Resume not found',
        null,
        RESPONSE_CODES.NOT_FOUND
      ));
    }

    res.json(createApiResponse(true, 'Resume retrieved successfully', { resume }));

  } catch (error) {
    logApiOperation('resume detail', `${req.params.id}: ${error.message}`, 'error');
    
    res.status(500).json(createApiResponse(
      false,
      'Server error fetching resume',
      null,
      RESPONSE_CODES.SERVER_ERROR
    ));
  }
});

/**
 * DELETE single resume by ID
 * Removes a specific resume from the database
 * @route DELETE /api/resumes/:id
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resume document ID to delete
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion result
 * @example
 * DELETE /api/resumes/64a7b8c9d1234567890abcde
 * Response: {
 *   "success": true,
 *   "message": "Resume deleted successfully",
 *   "data": {
 *     "deletedResume": {
 *       "id": "...",
 *       "name": "John Doe"
 *     }
 *   }
 * }
 */
router.delete('/resumes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json(createApiResponse(
        false,
        'Invalid resume ID format',
        null,
        RESPONSE_CODES.INVALID_ID
      ));
    }

    logApiOperation('resume delete', `attempting to delete resume ${id}`);

    const deletedResume = await Resume.findByIdAndDelete(id);

    if (!deletedResume) {
      return res.status(404).json(createApiResponse(
        false,
        'Resume not found',
        null,
        RESPONSE_CODES.NOT_FOUND
      ));
    }

    logApiOperation('resume delete', `successfully deleted resume ${id} (${deletedResume.candidateName || 'Unknown'})`);

    res.json(createApiResponse(true, 'Resume deleted successfully', {
      deletedResume: {
        id: deletedResume._id,
        name: deletedResume.candidateName || 'Unknown Candidate',
        email: deletedResume.email
      }
    }));

  } catch (error) {
    logApiOperation('resume delete', `${req.params.id}: ${error.message}`, 'error');
    
    res.status(500).json(createApiResponse(
      false,
      'Server error deleting resume',
      null,
      RESPONSE_CODES.SERVER_ERROR
    ));
  }
});

/**
 * DELETE all resumes (bulk delete)
 * Removes all resumes from the database - use with caution
 * @route DELETE /api/resumes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion result
 * @example
 * DELETE /api/resumes
 * Response: {
 *   "success": true,
 *   "message": "Successfully deleted 150 resumes",
 *   "data": {
 *     "deletedCount": 150
 *   }
 * }
 */
router.delete('/resumes', async (req, res) => {
  try {
    logApiOperation('bulk delete', 'attempting to delete all resumes', 'warn');

    const result = await Resume.deleteMany({});

    logApiOperation('bulk delete', `successfully deleted ${result.deletedCount} resumes`, 'warn');

    res.json(createApiResponse(true, `Successfully deleted ${result.deletedCount} resumes`, {
      deletedCount: result.deletedCount
    }));

  } catch (error) {
    logApiOperation('bulk delete', error.message, 'error');
    
    res.status(500).json(createApiResponse(
      false,
      'Server error deleting resumes',
      null,
      RESPONSE_CODES.SERVER_ERROR
    ));
  }
});

// ==================== RESULTS AND CANDIDATE ROUTES ====================

/**
 * GET screening results by screening ID
 * Retrieves comprehensive screening results with candidate rankings
 * @route GET /api/results/:id
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Screening document ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Screening results (delegates to results controller)
 * @middleware resultsController.getScreeningResults
 */
router.get('/results/:id', resultsController.getScreeningResults);

/**
 * GET candidate detail by resume ID
 * Retrieves detailed candidate information and resume data
 * @route GET /api/candidate/:id
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Resume/candidate document ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Candidate details (delegates to results controller)
 * @middleware resultsController.getCandidateDetail
 */
router.get('/candidate/:id', resultsController.getCandidateDetail);

// ==================== STATISTICS ROUTES ====================

/**
 * GET comprehensive system statistics
 * Returns overall system statistics for monitoring and dashboards
 * @route GET /api/stats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with system statistics
 * @example
 * GET /api/stats
 * Response: {
 *   "success": true,
 *   "data": {
 *     "stats": {
 *       "total": 150,
 *       "processed": 145,
 *       "unprocessed": 5,
 *       "processingRate": 97,
 *       "recentUploads": 12,
 *       "todayStats": {...}
 *     }
 *   }
 * }
 */
router.get('/stats', async (req, res) => {
  try {
    logApiOperation('stats', 'fetching comprehensive system statistics');

    // Get current statistics
    const [totalResumes, processedResumes] = await Promise.all([
      Resume.countDocuments({}),
      Resume.countDocuments({ isProcessed: true })
    ]);

    const unprocessedResumes = totalResumes - processedResumes;
    const processingRate = totalResumes > 0 ? Math.round((processedResumes / totalResumes) * 100) : 0;

    // Get recent statistics (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentUploads, recentProcessed] = await Promise.all([
      Resume.countDocuments({ createdAt: { $gte: yesterday } }),
      Resume.countDocuments({ processedAt: { $gte: yesterday } })
    ]);

    const stats = {
      total: totalResumes,
      processed: processedResumes,
      unprocessed: unprocessedResumes,
      processingRate,
      recentUploads,
      recentProcessed,
      todayStats: {
        uploads: recentUploads,
        processed: recentProcessed,
        processingEfficiency: recentUploads > 0 ? Math.round((recentProcessed / recentUploads) * 100) : 0
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(createApiResponse(true, 'Statistics retrieved successfully', { stats }));

  } catch (error) {
    logApiOperation('stats', error.message, 'error');
    
    res.status(500).json(createApiResponse(
      false,
      'Server error fetching statistics',
      null,
      RESPONSE_CODES.SERVER_ERROR
    ));
  }
});

// ==================== HEALTH CHECK ROUTES ====================

/**
 * GET API health check
 * Simple health check endpoint for API monitoring
 * @route GET /api/health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with API health status
 */
router.get('/health', async (req, res) => {
  try {
    // Quick database connectivity check
    await Resume.findOne({}).limit(1);
    
    res.json(createApiResponse(true, 'API is healthy', {
      status: 'healthy',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    }));

  } catch (error) {
    res.status(503).json(createApiResponse(false, 'API is unhealthy', {
      status: 'unhealthy',
      error: error.message
    }, 'HEALTH_CHECK_FAILED'));
  }
});

// ==================== MODULE EXPORTS ====================

module.exports = router;
