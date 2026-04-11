/**
 * Financial Health Index — holistic company health score (0-100).
 *
 * 4 dimensions:
 *   Liquidity (30%): can the company pay its bills?
 *   Stability (25%): is income consistent?
 *   Growth (25%): is the company growing?
 *   Efficiency (20%): is spending well-managed?
 */

const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Asset = require('../models/Asset');

async function calculateHealthIndex() {
  const [transactions, invoices, loans, assets] = await Promise.all([
    Transaction.find(), Invoice.find(), Loan.find(), Asset.find(),
  ]);

  const now = new Date();
  const d30 = new Date(now - 30 * 86400000);
  const d60 = new Date(now - 60 * 86400000);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cashFlow = totalIncome - totalExpenses;
  const monthlyExpenses = totalExpenses / Math.max(1, 12);
  const totalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const monthlyLoanPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const collectionRate = totalInvoiced > 0 ? paidInvoices.reduce((s, i) => s + i.amount, 0) / totalInvoiced : 1;

  // Recent income for trend
  const recent = transactions.filter(t => new Date(t.date) >= d30);
  const prev = transactions.filter(t => new Date(t.date) >= d60 && new Date(t.date) < d30);
  const recentIncome = recent.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevIncome = prev.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // ── Liquidity (30%) ──
  const cashCover = monthlyExpenses > 0 ? cashFlow / monthlyExpenses : 10;
  const liquidityScore = Math.min(100, Math.max(0,
    cashCover >= 6 ? 100 : cashCover >= 3 ? 75 : cashCover >= 1 ? 50 : cashCover >= 0 ? 25 : 10
  ));

  // ── Stability (25%) ──
  // Income variance across months
  const monthlyIncomes = {};
  transactions.filter(t => t.type === 'income').forEach(t => {
    const key = `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`;
    monthlyIncomes[key] = (monthlyIncomes[key] || 0) + t.amount;
  });
  const incomeValues = Object.values(monthlyIncomes);
  const avgIncome = incomeValues.length > 0 ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length : 0;
  const variance = incomeValues.length > 1
    ? Math.sqrt(incomeValues.reduce((s, v) => s + (v - avgIncome) ** 2, 0) / incomeValues.length) / (avgIncome || 1)
    : 0.5;
  const debtRatio = totalAssets > 0 ? totalDebt / totalAssets : (totalDebt > 0 ? 2 : 0);

  const stabilityScore = Math.min(100, Math.max(0,
    (variance < 0.15 ? 60 : variance < 0.3 ? 40 : variance < 0.5 ? 20 : 10) +
    (debtRatio < 0.3 ? 40 : debtRatio < 0.6 ? 25 : debtRatio < 1 ? 10 : 0)
  ));

  // ── Growth (25%) ──
  const growthRate = prevIncome > 0 ? (recentIncome - prevIncome) / prevIncome : (recentIncome > 0 ? 0.5 : 0);
  const clientCount = new Set(invoices.map(i => i.clientName)).size;

  const growthScore = Math.min(100, Math.max(0,
    (growthRate > 0.2 ? 60 : growthRate > 0.05 ? 45 : growthRate > -0.05 ? 30 : growthRate > -0.2 ? 15 : 5) +
    (clientCount >= 10 ? 40 : clientCount >= 5 ? 30 : clientCount >= 3 ? 20 : 10)
  ));

  // ── Efficiency (20%) ──
  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1;
  const loanBurden = (totalIncome / 12) > 0 ? monthlyLoanPayments / (totalIncome / 12) : 0;

  const efficiencyScore = Math.min(100, Math.max(0,
    (expenseRatio < 0.6 ? 50 : expenseRatio < 0.8 ? 40 : expenseRatio < 1 ? 25 : 10) +
    (collectionRate > 0.9 ? 30 : collectionRate > 0.7 ? 20 : collectionRate > 0.5 ? 10 : 5) +
    (loanBurden < 0.15 ? 20 : loanBurden < 0.3 ? 10 : 0)
  ));

  // ── Global Score ──
  const score = Math.round(
    liquidityScore * 0.30 + stabilityScore * 0.25 + growthScore * 0.25 + efficiencyScore * 0.20
  );

  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

  return {
    score,
    grade,
    dimensions: {
      liquidity: { score: liquidityScore, weight: '30%' },
      stability: { score: stabilityScore, weight: '25%' },
      growth: { score: growthScore, weight: '25%' },
      efficiency: { score: efficiencyScore, weight: '20%' },
    },
    metrics: { cashFlow, monthlyExpenses, cashCover: Math.round(cashCover * 10) / 10, debtRatio: Math.round(debtRatio * 100) / 100, growthRate: Math.round(growthRate * 100), collectionRate: Math.round(collectionRate * 100), expenseRatio: Math.round(expenseRatio * 100) / 100, clientCount },
  };
}

module.exports = { calculateHealthIndex };
