const router = require('express').Router();
const { generateReport, downloadReport, deleteReport, getReportHistory, runScheduler, downloadInvoicePDF, downloadTransactionPDF } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.post('/pdf/generate', protect, authorize('owner', 'admin'), generateReport);
router.get('/pdf/history', protect, authorize('owner', 'admin', 'auditor'), getReportHistory);
router.get('/pdf/:reportId', protect, authorize('owner', 'admin', 'auditor'), downloadReport);
router.delete('/pdf/:reportId', protect, authorize('owner', 'admin'), deleteReport);
router.get('/invoice-pdf/:invoiceId', protect, authorize('accountant', 'owner', 'admin'), downloadInvoicePDF);
router.get('/transaction-pdf/:transactionId', protect, authorize('accountant', 'owner', 'admin'), downloadTransactionPDF);
router.post('/scheduler/run-monthly-report', protect, authorize('admin', 'owner'), runScheduler);

module.exports = router;
