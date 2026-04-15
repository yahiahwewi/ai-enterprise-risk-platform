const router = require('express').Router();
const { getRiskReport, getFinalDecision, getHealthIndex, simulate, copilot, suggestCat, getGoalAdvice, getRecommendedScenario } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.get('/risk-report', protect, authorize('owner'), getRiskReport);
router.get('/final-decision', protect, authorize('owner'), getFinalDecision);
router.get('/health-index', protect, authorize('owner'), getHealthIndex);
router.post('/simulate', protect, authorize('owner'), simulate);
router.post('/copilot', protect, authorize('owner'), copilot);
router.post('/suggest-category', protect, suggestCat);
router.get('/goals/recommended', protect, authorize('owner'), getRecommendedScenario);
router.get('/goals/:scenario', protect, authorize('owner'), getGoalAdvice);

// Invoice extraction
const { extractInvoice, serveOriginalPdf } = require('../controllers/extractionController');
router.post('/extract-invoice', protect, authorize('accountant', 'owner', 'admin'), extractInvoice);
router.get('/invoice-pdf/:filename', protect, serveOriginalPdf);

module.exports = router;
