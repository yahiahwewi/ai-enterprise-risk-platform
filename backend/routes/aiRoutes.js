const router = require('express').Router();
const { getRiskReport, getFinalDecision } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.get('/risk-report', protect, authorize('owner'), getRiskReport);
router.get('/final-decision', protect, authorize('owner'), getFinalDecision);

module.exports = router;
