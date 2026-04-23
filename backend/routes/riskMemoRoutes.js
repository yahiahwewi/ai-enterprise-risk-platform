const router = require('express').Router();
const { list, create, remove, acknowledge, pendingAlerts } = require('../controllers/riskMemoController');
const { protect, authorize } = require('../middleware/auth');

// Owner/admin: list pending critical alerts (must come before /:id)
router.get('/pending-alerts',        protect, authorize('owner', 'admin'), pendingAlerts);
router.post('/:id/acknowledge',      protect, authorize('owner', 'admin'), acknowledge);

router.get('/',        protect, authorize('analyst', 'owner', 'admin', 'auditor'), list);
router.post('/',       protect, authorize('analyst', 'owner'),                      create);
router.delete('/:id',  protect, authorize('analyst', 'owner', 'admin'),             remove);

module.exports = router;
