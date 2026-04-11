const Notification = require('../models/Notification');
const User = require('../models/User');

async function createNotification({ userId, type, title, message, severity = 'info', metadata = {} }) {
  try {
    return await Notification.create({ userId, type, title, message, severity, metadata });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

// Notify all users about risk alerts
async function checkAndNotifyRiskAlerts(globalScore, level) {
  if (globalScore < 50) return;

  const severity = globalScore >= 75 ? 'critical' : 'warning';
  const title = globalScore >= 75 ? 'Critical Risk Alert' : 'Elevated Risk Warning';
  const message = globalScore >= 75
    ? `Risk score has reached ${globalScore}/100 (critical). Immediate action is recommended.`
    : `Risk score is ${globalScore}/100 (high). Review the risk report for details.`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await Notification.findOne({
    type: 'risk_alert',
    read: false,
    createdAt: { $gte: today },
  });
  if (existing) return;

  const users = await User.find().select('_id');
  const notifications = users.map((u) => ({
    userId: u._id,
    type: 'risk_alert',
    title,
    message,
    severity,
  }));

  await Notification.insertMany(notifications).catch(() => {});
}

async function checkOverdueInvoices(lateInvoices) {
  if (!lateInvoices || lateInvoices.length === 0) return;

  const owner = await User.findOne({ role: 'owner' }).select('_id');
  if (!owner) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await Notification.findOne({
    type: 'invoice_overdue',
    read: false,
    createdAt: { $gte: today },
  });
  if (existing) return;

  const totalOverdue = lateInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  await createNotification({
    userId: owner._id,
    type: 'invoice_overdue',
    title: 'Overdue Invoices Detected',
    message: `${lateInvoices.length} invoice(s) totaling $${totalOverdue.toLocaleString()} are overdue.`,
    severity: 'warning',
    metadata: { count: lateInvoices.length, totalAmount: totalOverdue },
  });
}

async function checkNegativeCashFlow(cashFlow) {
  if (cashFlow >= 0) return;

  const owner = await User.findOne({ role: 'owner' }).select('_id');
  if (!owner) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await Notification.findOne({
    type: 'cash_flow_negative',
    read: false,
    createdAt: { $gte: today },
  });
  if (existing) return;

  await createNotification({
    userId: owner._id,
    type: 'cash_flow_negative',
    title: 'Negative Cash Flow Alert',
    message: `Cash flow is -$${Math.abs(cashFlow).toLocaleString()}. Expenses exceed income.`,
    severity: 'critical',
    metadata: { cashFlow },
  });
}

module.exports = { createNotification, checkAndNotifyRiskAlerts, checkOverdueInvoices, checkNegativeCashFlow };
