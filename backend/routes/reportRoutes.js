const router = require('express').Router();
const { generateReport, downloadReport, getReportHistory, runScheduler, downloadInvoicePDF } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.post('/pdf/generate', protect, authorize('owner', 'admin'), generateReport);
router.get('/pdf/history', protect, getReportHistory);
router.get('/pdf/:reportId', protect, downloadReport);
router.get('/invoice-pdf/:invoiceId', protect, authorize('accountant', 'owner', 'admin'), downloadInvoicePDF);
router.post('/scheduler/run-monthly-report', protect, authorize('admin', 'owner'), runScheduler);

module.exports = router;
