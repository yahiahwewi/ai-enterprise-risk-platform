const router = require('express').Router();
const { getActivityLog } = require('../controllers/activityController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('owner', 'admin', 'auditor'), getActivityLog);

module.exports = router;
