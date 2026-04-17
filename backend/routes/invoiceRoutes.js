const router = require('express').Router();
const { createInvoice, getInvoices, updateInvoice, deleteInvoice, checkInvoiceIntegrity, checkAllIntegrity } = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');
const { validateInvoice, validateInvoiceUpdate } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

// Integrity routes — must come BEFORE /:id to avoid parameter collision
router.get('/integrity/all', protect, authorize('accountant', 'owner', 'auditor'), checkAllIntegrity);
router.get('/:id/integrity',  protect, authorize('accountant', 'owner', 'auditor'), checkInvoiceIntegrity);

router.post('/', protect, authorize('accountant', 'owner'), validateInvoice, logActivity('created', 'invoice'), createInvoice);
router.get('/', protect, getInvoices); // all authenticated roles can read (auditor included)
router.patch('/:id', protect, authorize('accountant', 'owner'), validateInvoiceUpdate, logActivity('status_changed', 'invoice'), updateInvoice);
router.delete('/:id', protect, authorize('accountant', 'owner'), deleteInvoice);

module.exports = router;
