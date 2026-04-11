const router = require('express').Router();
const { createTransaction, getTransactions } = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.post('/', protect, authorize('accountant', 'owner'), validateTransaction, logActivity('created', 'transaction'), createTransaction);
router.get('/', protect, getTransactions);

module.exports = router;
