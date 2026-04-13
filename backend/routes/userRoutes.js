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

// Dev: reset all financial data (keep users, presets, rules)
router.post('/reset-data', protect, authorize('admin'), async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const Invoice = require('../models/Invoice');
    const Loan = require('../models/Loan');
    const Asset = require('../models/Asset');
    const Notification = require('../models/Notification');
    const ActivityLog = require('../models/ActivityLog');
    const Report = require('../models/Report');
    const ApprovalRequest = require('../models/ApprovalRequest');

    const counts = {
      transactions: await Transaction.countDocuments(),
      invoices: await Invoice.countDocuments(),
      loans: await Loan.countDocuments(),
      assets: await Asset.countDocuments(),
      notifications: await Notification.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
      reports: await Report.countDocuments(),
      approvals: await ApprovalRequest.countDocuments(),
    };

    await Promise.all([
      Transaction.deleteMany({}),
      Invoice.deleteMany({}),
      Loan.deleteMany({}),
      Asset.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
      Report.deleteMany({}),
      ApprovalRequest.deleteMany({}),
    ]);

    // Clean uploaded invoice files
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.resolve(__dirname, '../uploads/invoices');
    if (fs.existsSync(uploadDir)) {
      fs.readdirSync(uploadDir).forEach(f => { try { fs.unlinkSync(path.join(uploadDir, f)); } catch {} });
    }
    // Clean generated report files
    const reportDir = path.resolve(__dirname, '../reports');
    if (fs.existsSync(reportDir)) {
      fs.readdirSync(reportDir).forEach(f => { try { fs.unlinkSync(path.join(reportDir, f)); } catch {} });
    }

    res.json({ message: 'All financial data deleted', deleted: counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
