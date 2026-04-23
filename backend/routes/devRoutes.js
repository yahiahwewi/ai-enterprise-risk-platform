const express = require('express');
const router = express.Router();
const { seedScenario } = require('../controllers/devController');
const pdfTest = require('../controllers/pdfTestController');
const { protect, authorize } = require('../middleware/auth');

// POST /api/dev/seed/:scenario — owner only
router.post('/seed/:scenario', protect, authorize('owner', 'admin'), seedScenario);

// Dev sandbox: signed PDF test (any authenticated user can try)
router.post('/pdf-test/generate',  protect, pdfTest.generate);
router.post('/pdf-test/:id/tamper', protect, pdfTest.tamper);
router.get('/pdf-test/:id',         protect, pdfTest.download);

module.exports = router;
