const router = require('express').Router();
const { getAuditSummary } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

router.get('/summary', protect, authorize('auditor', 'admin', 'owner'), getAuditSummary);

module.exports = router;
