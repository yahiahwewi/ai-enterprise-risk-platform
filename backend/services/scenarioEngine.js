/**
 * Scenario Simulation Engine — "What if" analysis.
 *
 * Adjusts financial data temporarily and re-runs risk analysis
 * to show how changes would impact the company's risk profile.
 */

const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Asset = require('../models/Asset');

async function simulateScenario(params = {}) {
  const { expenseChange = 0, lateInvoiceCount = 0, rateIncrease = 0 } = params;

  const [transactions, invoices, loans, assets] = await Promise.all([
    Transaction.find(), Invoice.find(), Loan.find(), Asset.find(),
  ]);

  // ── Baseline calculation ──
  const baseIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const baseExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const baseCashFlow = baseIncome - baseExpenses;
  const baseTotalInvoices = invoices.reduce((s, i) => s + i.amount, 0);
  const baseUnpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const baseLate = invoices.filter(i => i.status === 'late').length;
  const baseTotalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const baseTotalAssets = assets.reduce((s, a) => s + a.value, 0);
  const baseMonthlyPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  const baseScore = computeScore(baseIncome, baseExpenses, baseTotalInvoices, baseUnpaid, invoices.filter(i => i.status === 'late').reduce((s, i) => s + i.amount, 0), baseTotalDebt, baseTotalAssets, baseMonthlyPayments);

  // ── Simulated calculation ──
  const simExpenses = baseExpenses * (1 + expenseChange / 100);
  const simCashFlow = baseIncome - simExpenses;

  // Simulate additional late invoices
  let simLateAmount = invoices.filter(i => i.status === 'late').reduce((s, i) => s + i.amount, 0);
  const pendingInvoices = invoices.filter(i => i.status === 'pending').sort((a, b) => b.amount - a.amount);
  const newLate = Math.min(lateInvoiceCount, pendingInvoices.length);
  for (let i = 0; i < newLate; i++) {
    simLateAmount += pendingInvoices[i].amount;
  }
  const simUnpaid = baseUnpaid + pendingInvoices.slice(0, newLate).reduce((s, i) => s + i.amount, 0);

  // Simulate rate increase on loans
  let simMonthlyPayments = 0;
  for (const loan of loans) {
    const newRate = (loan.interestRate + rateIncrease) / 100 / 12;
    const n = loan.duration;
    if (newRate === 0) { simMonthlyPayments += loan.amount / n; }
    else { simMonthlyPayments += (loan.amount * newRate * Math.pow(1 + newRate, n)) / (Math.pow(1 + newRate, n) - 1); }
  }
  simMonthlyPayments = Math.round(simMonthlyPayments * 100) / 100;

  const simScore = computeScore(baseIncome, simExpenses, baseTotalInvoices, simUnpaid, simLateAmount, baseTotalDebt, baseTotalAssets, simMonthlyPayments);

  const delta = simScore - baseScore;
  const impact = Math.abs(delta) >= 15 ? 'high' : Math.abs(delta) >= 5 ? 'medium' : 'low';

  return {
    baseline: { score: baseScore, cashFlow: Math.round(baseCashFlow), monthlyPayments: Math.round(baseMonthlyPayments), lateInvoices: baseLate },
    simulated: { score: simScore, cashFlow: Math.round(simCashFlow), monthlyPayments: Math.round(simMonthlyPayments), lateInvoices: baseLate + newLate },
    delta: { scoreChange: delta, cashFlowChange: Math.round(simCashFlow - baseCashFlow), paymentsChange: Math.round(simMonthlyPayments - baseMonthlyPayments) },
    impact,
    params: { expenseChange, lateInvoiceCount, rateIncrease },
  };
}

function computeScore(income, expenses, totalInv, unpaid, lateAmt, debt, assets, monthlyPay) {
  let cashFlowRisk = income === 0 ? 80 : (expenses / income > 1.2 ? 95 : expenses / income > 1.0 ? 75 : expenses / income > 0.8 ? 40 : 15);
  let invoiceRisk = totalInv === 0 ? 10 : Math.min(100, Math.round((unpaid / totalInv) * 60 + (lateAmt / totalInv) * 40));
  let debtRisk = debt === 0 ? 5 : (assets === 0 ? 90 : (debt / assets > 2 ? 95 : debt / assets > 1 ? 70 : debt / assets > 0.5 ? 40 : 15));
  let loanRisk = 0;
  const monthly = income / 12;
  if (monthly === 0 && monthlyPay > 0) loanRisk = 95;
  else if (monthly > 0) { const r = monthlyPay / monthly; loanRisk = r > 0.5 ? 90 : r > 0.3 ? 60 : r > 0.15 ? 30 : 10; }
  return Math.round(cashFlowRisk * 0.35 + invoiceRisk * 0.25 + debtRisk * 0.25 + loanRisk * 0.15);
}

module.exports = { simulateScenario };
