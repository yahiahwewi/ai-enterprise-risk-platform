const Loan = require('../models/Loan');

/**
 * Compute the correct monthly payment using the standard amortization formula:
 *   M = P × r / (1 − (1 + r)^−n)
 * where:
 *   P = principal (loan amount)
 *   r = monthly interest rate (annualRate / 100 / 12)
 *   n = duration in months
 *
 * If interestRate = 0, monthly payment = amount / duration (no interest).
 */
function computeMonthlyPayment(amount, annualRate, durationMonths) {
  if (!durationMonths || durationMonths <= 0) return 0;
  if (!annualRate || annualRate <= 0) {
    return Math.round((amount / durationMonths) * 1000) / 1000;
  }
  const r = annualRate / 100 / 12;
  const payment = (amount * r) / (1 - Math.pow(1 + r, -durationMonths));
  return Math.round(payment * 1000) / 1000;
}

exports.createLoan = async (req, res) => {
  try {
    const { amount, interestRate, duration } = req.body;

    // Always recalculate — never trust the client-submitted monthlyPayment
    const monthlyPayment = computeMonthlyPayment(
      parseFloat(amount),
      parseFloat(interestRate),
      parseInt(duration, 10)
    );

    const loan = await Loan.create({ ...req.body, monthlyPayment });
    res.locals.createdEntityId = loan._id;
    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
