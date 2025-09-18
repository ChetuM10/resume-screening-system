const express = require('express');
const router = express.Router();

// Placeholder routes - we'll implement these later
router.get('/status', (req, res) => {
    res.json({
        isLoaded: false,
        categories: []
    });
});

router.post('/train', (req, res) => {
    res.json({
        success: false,
        error: 'ML training not implemented yet'
    });
});

router.post('/predict', (req, res) => {
    res.json({
        success: false,
        error: 'ML prediction not implemented yet'
    });
});

module.exports = router;
