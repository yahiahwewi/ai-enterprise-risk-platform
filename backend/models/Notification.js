const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['risk_alert', 'invoice_overdue', 'cash_flow_negative', 'anomaly_detected', 'system', 'rule_triggered', 'approval_needed', 'daily_summary', 'weekly_report', 'analyst_alert', 'alert_acknowledged'],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  priority: { type: Number, default: 50, min: 1, max: 100 },
  group: { type: String, enum: ['financial', 'operational', 'ai_prediction', 'system'], default: 'system' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
