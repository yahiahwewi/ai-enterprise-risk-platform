const router = require('express').Router();
const { getPendingApprovals, getAllApprovals, approveStep, rejectStep } = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

router.get('/pending', protect, getPendingApprovals);
router.get('/', protect, authorize('admin', 'owner'), getAllApprovals);
router.patch('/:id/approve', protect, authorize('admin', 'owner'), approveStep);
router.patch('/:id/reject', protect, authorize('admin', 'owner'), rejectStep);

module.exports = router;
