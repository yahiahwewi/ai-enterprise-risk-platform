const router = require('express').Router();
const { getUsers, inviteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validateInvite } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.get('/', protect, authorize('admin', 'owner'), getUsers);
router.post('/invite', protect, authorize('owner'), validateInvite, logActivity('invited', 'user'), inviteUser);

module.exports = router;
