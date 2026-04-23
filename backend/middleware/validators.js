const { body, validationResult } = require('express-validator');

// Reusable middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['accountant', 'finance', 'analyst', 'auditor']).withMessage('Role must be accountant, finance, analyst or auditor'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validateTransaction = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').optional().trim(),
  handleValidationErrors,
];

const validateInvoice = [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('dueDate').isISO8601().withMessage('Valid date is required'),
  body('status').optional().isIn(['paid', 'pending', 'late']).withMessage('Invalid status'),
  handleValidationErrors,
];

const validateInvoiceUpdate = [
  body('status').optional().isIn(['paid', 'pending', 'late']).withMessage('Invalid status'),
  body('clientName').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ min: 0 }),
  body('dueDate').optional().isISO8601(),
  handleValidationErrors,
];

const validateLoan = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('interestRate').isFloat({ min: 0 }).withMessage('Interest rate must be positive'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
  body('monthlyPayment').isFloat({ min: 0 }).withMessage('Monthly payment must be positive'),
  handleValidationErrors,
];

const validateAsset = [
  body('name').trim().notEmpty().withMessage('Asset name is required'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  body('depreciationRate').isFloat({ min: 0, max: 100 }).withMessage('Depreciation rate must be 0-100'),
  handleValidationErrors,
];

const validateInvite = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['accountant', 'finance', 'analyst', 'auditor']).withMessage('Role must be accountant, finance, analyst or auditor'),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateTransaction,
  validateInvoice,
  validateInvoiceUpdate,
  validateLoan,
  validateAsset,
  validateInvite,
};
