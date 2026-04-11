const router = require('express').Router();
const { createLoan, getLoans } = require('../controllers/loanController');
const { protect, authorize } = require('../middleware/auth');
const { validateLoan } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.post('/', protect, authorize('finance', 'owner'), validateLoan, logActivity('created', 'loan'), createLoan);
router.get('/', protect, getLoans);

module.exports = router;
