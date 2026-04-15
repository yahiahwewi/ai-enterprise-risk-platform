const express = require('express');
const router = express.Router();
const { seedScenario } = require('../controllers/devController');
const { protect, authorize } = require('../middleware/auth');

// POST /api/dev/seed/:scenario — owner only
router.post('/seed/:scenario', protect, authorize('owner', 'admin'), seedScenario);

module.exports = router;
