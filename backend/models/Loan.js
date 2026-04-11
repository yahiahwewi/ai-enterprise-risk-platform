const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 1 }, // in months
  monthlyPayment: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
