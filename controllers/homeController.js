const Resume = require('../models/Resume');
const Screening = require('../models/Screening');

exports.getDashboard = async (req, res) => {
  try {
    console.log('🏠 Loading dashboard data...');

    // Count total resumes uploaded
    const uploaded = await Resume.countDocuments();
    
    // Count resumes that are processed
    const processed = await Resume.countDocuments({ isProcessed: true });
    
    // Count total screening sessions
    const screenings = await Screening.countDocuments();
    
    // Calculate top match score across all screenings
    let topScore = 0;
    const topScreeningAgg = await Screening.aggregate([
      { $unwind: '$results' },
      { $group: { _id: null, maxScore: { $max: '$results.matchScore' } } }
    ]);
    
    if (topScreeningAgg && topScreeningAgg.length > 0) {
      topScore = Math.round(topScreeningAgg[0].maxScore) || 0;
    }

    console.log(`📊 Dashboard Stats: ${uploaded} uploaded, ${processed} processed, ${screenings} screenings, ${topScore}% top score`);

    // Prepare stats object for the view
    const stats = {
      uploaded,
      processed,
      screenings,
      topScore
    };

    // Render dashboard with stats
    res.render('pages/index', {
      title: 'Resume Screening Dashboard',
      stats: stats,
      currentYear: new Date().getFullYear()
    });

  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    res.status(500).render('pages/error', {
      title: 'Dashboard Error',
      message: 'Unable to load dashboard. Please try again.',
      currentYear: new Date().getFullYear()
    });
  }
};

// Get dashboard data as JSON (for AJAX requests)
exports.getDashboardJson = async (req, res) => {
  try {
    const uploaded = await Resume.countDocuments();
    const processed = await Resume.countDocuments({ isProcessed: true });
    const screenings = await Screening.countDocuments();
    
    let topScore = 0;
    const topScreeningAgg = await Screening.aggregate([
      { $unwind: '$results' },
      { $group: { _id: null, maxScore: { $max: '$results.matchScore' } } }
    ]);
    
    if (topScreeningAgg && topScreeningAgg.length > 0) {
      topScore = Math.round(topScreeningAgg[0].maxScore) || 0;
    }

    res.json({
      success: true,
      data: {
        uploaded,
        processed,
        screenings,
        topScore,
        processingRate: uploaded > 0 ? Math.round((processed / uploaded) * 100) : 0
      }
    });

  } catch (error) {
    console.error('❌ Dashboard API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to fetch dashboard data'
    });
  }
};
