const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
  role: { type: String, required: true },
  order: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  date: { type: Date },
  comment: { type: String, trim: true },
}, { _id: false });

const approvalRequestSchema = new mongoose.Schema({
  entityType: { type: String, enum: ['transaction', 'invoice', 'loan'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  triggeredRule: { type: String },
  currentStep: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  steps: [approvalStepSchema],
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

approvalRequestSchema.index({ status: 1, 'steps.role': 1 });
approvalRequestSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
