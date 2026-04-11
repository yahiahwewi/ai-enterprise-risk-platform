const router = require('express').Router();
const { getUsers, getPendingUsers, approveUser, rejectUser, inviteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateInvite } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.get('/', protect, authorize('admin', 'owner'), getUsers);
router.get('/pending', protect, authorize('admin'), getPendingUsers);
router.patch('/:id/approve', protect, authorize('admin'), approveUser);
router.patch('/:id/reject', protect, authorize('admin'), rejectUser);
router.post('/invite', protect, authorize('owner', 'admin'), validateInvite, logActivity('invited', 'user'), inviteUser);

module.exports = router;
