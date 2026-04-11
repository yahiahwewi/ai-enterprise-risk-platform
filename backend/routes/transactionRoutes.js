const router = require('express').Router();
const { createTransaction, getTransactions, updateTransaction, deleteTransaction } = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.post('/', protect, authorize('accountant', 'owner'), validateTransaction, logActivity('created', 'transaction'), createTransaction);
router.get('/', protect, getTransactions);
router.patch('/:id', protect, authorize('accountant', 'owner'), updateTransaction);
router.delete('/:id', protect, authorize('accountant', 'owner'), deleteTransaction);

module.exports = router;
