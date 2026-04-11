const router = require('express').Router();
const { createInvoice, getInvoices, updateInvoice } = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');
const { validateInvoice, validateInvoiceUpdate } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.post('/', protect, authorize('accountant', 'owner'), validateInvoice, logActivity('created', 'invoice'), createInvoice);
router.get('/', protect, getInvoices);
router.patch('/:id', protect, authorize('accountant', 'owner'), validateInvoiceUpdate, logActivity('status_changed', 'invoice'), updateInvoice);

module.exports = router;
