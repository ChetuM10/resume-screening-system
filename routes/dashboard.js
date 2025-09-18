/**
 * @fileoverview Dashboard Routes - COMPLETE FIXED VERSION
 * Added missing top-scores route and enhanced functionality
 */

const express = require('express');
const Resume = require('../models/Resume');
const Screening = require('../models/Screening');
const router = express.Router();

// ==================== CONFIGURATION ====================

const DASHBOARD_CONFIG = {
    RECENT_SCREENINGS_LIMIT: 10,
    TOP_CANDIDATES_PER_SCREENING: 3,
    TOP_CANDIDATES_TOTAL: 20,
    SEARCH_RESULTS_LIMIT: 10,
    MIN_SEARCH_LENGTH: 2
};

const ERROR_CONFIG = {
    SHOW_STACK_TRACE: process.env.NODE_ENV === 'development'
};

// ==================== UTILITY FUNCTIONS ====================

function logDashboardOperation(operation, count, sample = null) {
    console.log(`📊 ${operation}: ${count}`);
    if (sample && count > 0) {
        console.log(' ↳ sample:', sample);
    }
}

function createErrorResponse(title, message, error = null) {
    return {
        title,
        message,
        error: ERROR_CONFIG.SHOW_STACK_TRACE ? error : {},
        currentYear: new Date().getFullYear()
    };
}

function extractTopCandidatesFromScreening(screening) {
    return (screening.results || [])
        .filter(candidate => candidate.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, DASHBOARD_CONFIG.TOP_CANDIDATES_PER_SCREENING)
        .map(candidate => ({
            candidateName: candidate.candidateName,
            email: candidate.email,
            phone: candidate.phone,
            matchScore: candidate.matchScore,
            jobTitle: screening.jobTitle,
            screeningDate: screening.createdAt,
            screeningId: screening._id,
            skills: candidate.skills,
            experienceYears: candidate.experienceYears,
            resumeId: candidate.resumeId
        }));
}

// ==================== RESUME MANAGEMENT ROUTES ====================

router.get('/resumes/uploaded', async (req, res) => {
    try {
        const resumes = await Resume.find({}).sort({ uploadDate: -1 }).lean();
        
        logDashboardOperation('Uploaded resumes', resumes.length);

        res.render('dashboard/resumes-list', {
            title: 'Uploaded Resumes',
            pageTitle: 'All Uploaded Resumes',
            pageSubtitle: 'Manage and review all resumes in your database',
            type: 'uploaded',
            resumes,
            totalCount: resumes.length,
            currentYear: new Date().getFullYear()
        });
    } catch (error) {
        console.error('Error fetching uploaded resumes:', error);
        res.status(500).render('pages/error', createErrorResponse(
            'Error',
            'Failed to load uploaded resumes',
            error
        ));
    }
});

router.get('/resumes/processed', async (req, res) => {
    try {
        const resumes = await Resume.find({ isProcessed: true }).sort({ processedAt: -1 }).lean();
        
        logDashboardOperation('Processed resumes', resumes.length);

        res.render('dashboard/processed-list', {
            title: 'Processed Resumes',
            pageTitle: 'Processed Resumes',
            pageSubtitle: 'Resumes that have been successfully analyzed and processed',
            type: 'processed',
            resumes,
            totalCount: resumes.length,
            currentYear: new Date().getFullYear()
        });
    } catch (error) {
        console.error('Error fetching processed resumes:', error);
        res.status(500).render('pages/error', createErrorResponse(
            'Error',
            'Failed to load processed resumes',
            error
        ));
    }
});

// ✅ FIX: ADD MISSING TOP-SCORES ROUTE
router.get('/resumes/top-scores', async (req, res) => {
    try {
        const recentScreenings = await Screening.find({})
            .sort({ createdAt: -1 })
            .limit(DASHBOARD_CONFIG.RECENT_SCREENINGS_LIMIT)
            .lean();

        const screenings = recentScreenings || [];
        let topCandidates = [];

        screenings.forEach(screening => {
            const screeningTopCandidates = extractTopCandidatesFromScreening(screening);
            topCandidates.push(...screeningTopCandidates);
        });

        // Sort by match score and limit results
        topCandidates.sort((a, b) => b.matchScore - a.matchScore);
        topCandidates = topCandidates.slice(0, DASHBOARD_CONFIG.TOP_CANDIDATES_TOTAL);

        // Add rankings and score grades
        const rankedCandidates = topCandidates.map((candidate, index) => ({
            ...candidate,
            overallRank: index + 1,
            scoreGrade: candidate.matchScore >= 90 ? 'A+' :
                       candidate.matchScore >= 80 ? 'A' :
                       candidate.matchScore >= 70 ? 'B+' :
                       candidate.matchScore >= 60 ? 'B' : 'C'
        }));

        logDashboardOperation('Top-score candidates', topCandidates.length);

        res.render('dashboard/top-scores', {
            title: 'Top Match Scores',
            screenings: screenings,
            pageTitle: 'Top-Scoring Candidates',
            pageSubtitle: 'Highest scoring candidates across all screenings',
            candidates: rankedCandidates,
            totalCount: rankedCandidates.length,
            averageScore: rankedCandidates.length > 0
                ? Math.round(rankedCandidates.reduce((sum, c) => sum + c.matchScore, 0) / rankedCandidates.length)
                : 0,
            currentYear: new Date().getFullYear()
        });
    } catch (error) {
        console.error('Error fetching top scores:', error);
        res.status(500).render('pages/error', {
            title: 'System Error',
            message: 'Failed to load top matches',
            error: ERROR_CONFIG.SHOW_STACK_TRACE ? error.message : 'An unexpected error occurred',
            currentYear: new Date().getFullYear()
        });
    }
});

// ==================== SCREENING MANAGEMENT ROUTES ====================

router.get('/screenings', async (req, res) => {
    try {
        const screenings = await Screening.find({}).sort({ createdAt: -1 }).lean();
        
        const enhancedScreenings = screenings.map(screening => ({
            ...screening,
            candidateCount: screening.results?.length || 0,
            qualificationRate: screening.statistics?.totalCandidates > 0
                ? Math.round((screening.statistics.qualifiedCandidates / screening.statistics.totalCandidates) * 100)
                : 0,
            daysSinceCreation: Math.floor((Date.now() - new Date(screening.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        }));

        logDashboardOperation('Screenings', screenings.length);

        res.render('dashboard/screenings-list', {
            title: 'Completed Screenings',
            pageTitle: 'Completed Screenings',
            pageSubtitle: 'Manage and review your candidate screening sessions',
            screenings: enhancedScreenings,
            totalCount: screenings.length,
            currentYear: new Date().getFullYear()
        });
    } catch (error) {
        console.error('Error fetching screenings:', error);
        res.status(500).render('pages/error', createErrorResponse(
            'Error',
            'Failed to load screenings',
            error
        ));
    }
});

// ==================== CANDIDATE PROFILE ROUTE ====================

router.get('/candidate/:id', async (req, res) => {
    try {
        const candidateId = req.params.id;

        // Validate MongoDB ObjectId format
        if (!candidateId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).render('pages/error', {
                title: 'Invalid ID',
                message: 'Invalid candidate ID format',
                currentYear: new Date().getFullYear()
            });
        }

        const candidate = await Resume.findById(candidateId).lean();
        if (!candidate) {
            return res.status(404).render('pages/error', {
                title: 'Profile Not Found',
                message: 'Candidate profile not found',
                currentYear: new Date().getFullYear()
            });
        }

        console.log(`📋 Viewing profile: ${candidate.candidateName}`);

        res.render('pages/candidateDetail', {
            title: `${candidate.candidateName} - Profile`,
            resume: candidate,
            currentYear: new Date().getFullYear()
        });
    } catch (error) {
        console.error('Profile loading error:', error);
        res.status(500).render('pages/error', {
            title: 'Server Error',
            message: 'Unable to load candidate profile',
            currentYear: new Date().getFullYear()
        });
    }
});

// ==================== DELETE CANDIDATE ROUTE ====================

router.delete('/candidate/:id', async (req, res) => {
    try {
        const candidateId = req.params.id;

        // Validate MongoDB ObjectId format
        if (!candidateId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid candidate ID format',
                code: 'INVALID_ID'
            });
        }

        console.log(`🗑️ Attempting to delete candidate: ${candidateId}`);
        
        const deletedResume = await Resume.findByIdAndDelete(candidateId);
        if (!deletedResume) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found',
                code: 'CANDIDATE_NOT_FOUND'
            });
        }

        // Also remove from screening results
        await Screening.updateMany(
            { 'results.resumeId': candidateId },
            { $pull: { results: { resumeId: candidateId } } }
        );

        console.log(`✅ Successfully deleted candidate: ${deletedResume.candidateName}`);

        res.status(200).json({
            success: true,
            message: 'Candidate deleted successfully',
            data: {
                deletedId: candidateId,
                deletedName: deletedResume.candidateName
            }
        });

    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting candidate. Please try again.',
            code: 'DELETE_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==================== API ROUTES ====================

router.get('/api/stats', async (req, res) => {
    try {
        const [uploaded, processed, screenings] = await Promise.all([
            Resume.countDocuments({}),
            Resume.countDocuments({ isProcessed: true }),
            Screening.countDocuments({})
        ]);

        const processingRate = uploaded > 0 ? Math.round((processed / uploaded) * 100) : 0;

        res.json({
            success: true,
            statistics: {
                uploaded,
                processed,
                screenings,
                processingRate,
                unprocessed: uploaded - processed
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Stats fetch failed',
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== SEARCH FUNCTIONALITY ====================

router.get('/search', async (req, res) => {
    try {
        const { q, type = 'resumes' } = req.query;
        
        if (!q || q.trim().length < DASHBOARD_CONFIG.MIN_SEARCH_LENGTH) {
            return res.json({
                success: false,
                message: `Query must be at least ${DASHBOARD_CONFIG.MIN_SEARCH_LENGTH} characters long`,
                minLength: DASHBOARD_CONFIG.MIN_SEARCH_LENGTH
            });
        }

        const searchQuery = q.trim();
        let results = [];

        if (type === 'resumes') {
            results = await Resume.find({
                $or: [
                    { candidateName: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } },
                    { skills: { $in: [new RegExp(searchQuery, 'i')] } }
                ]
            })
            .limit(DASHBOARD_CONFIG.SEARCH_RESULTS_LIMIT)
            .select('candidateName email skills isProcessed createdAt')
            .lean();

            results = results.map(resume => ({
                ...resume,
                type: 'resume',
                matchReason: resume.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ? 'name' :
                           resume.email.toLowerCase().includes(searchQuery.toLowerCase()) ? 'email' : 'skills'
            }));
        }

        res.json({
            success: true,
            results,
            count: results.length,
            query: searchQuery,
            type
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed. Please try again.',
            error: ERROR_CONFIG.SHOW_STACK_TRACE ? error.message : undefined
        });
    }
});

module.exports = router;
