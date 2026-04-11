const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['paid', 'pending', 'late'],
    default: 'pending',
  },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  description: { type: String, trim: true, default: '' },
  reference: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  workflowStatus: { type: String, enum: ['draft', 'pending_approval', 'approved', 'rejected', 'locked'], default: 'draft' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: { type: Date },
  rejectionReason: { type: String, trim: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
