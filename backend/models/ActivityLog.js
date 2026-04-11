const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['created', 'updated', 'deleted', 'invited', 'status_changed'],
    required: true,
  },
  entityType: {
    type: String,
    enum: ['transaction', 'invoice', 'loan', 'asset', 'user'],
    required: true,
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: { type: String, trim: true },
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
