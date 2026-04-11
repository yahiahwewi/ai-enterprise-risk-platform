const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  category: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
