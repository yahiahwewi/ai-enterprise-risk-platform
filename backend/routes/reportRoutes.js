const router = require('express').Router();
const { generateReport, downloadReport, getReportHistory, runScheduler } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// PDF Export
router.post('/pdf/generate', protect, authorize('owner', 'admin'), generateReport);
router.get('/pdf/history', protect, getReportHistory);
router.get('/pdf/:reportId', protect, downloadReport);

// Scheduler
router.post('/scheduler/run-monthly-report', protect, authorize('admin', 'owner'), runScheduler);

module.exports = router;
