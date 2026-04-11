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
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
