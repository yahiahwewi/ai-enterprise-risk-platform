const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  category: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  reference: { type: String, trim: true, default: '' },
  paymentMethod: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  workflowStatus: { type: String, enum: ['draft', 'pending_approval', 'approved', 'rejected', 'locked'], default: 'draft' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: { type: Date },
  rejectionReason: { type: String, trim: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
