const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Asset = require('../models/Asset');

/**
 * Invoice Risk Scoring — per-invoice late probability
 */
async function getInvoiceRiskScores() {
  const invoices = await Invoice.find({ status: { $ne: 'paid' } });
  const allInvoices = await Invoice.find();

  // Build client history: ratio of late invoices per client
  const clientHistory = {};
  allInvoices.forEach((inv) => {
    if (!clientHistory[inv.clientName]) clientHistory[inv.clientName] = { total: 0, late: 0 };
    clientHistory[inv.clientName].total++;
    if (inv.status === 'late') clientHistory[inv.clientName].late++;
  });

  return invoices.map((inv) => {
    const now = new Date();
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.max(0, Math.floor((now - dueDate) / 86400000));
    const history = clientHistory[inv.clientName] || { total: 1, late: 0 };
    const lateRatio = history.late / history.total;

    // Score: 0-100
    let score = 0;

    // Days overdue factor (0-40 pts)
    if (daysOverdue > 90) score += 40;
    else if (daysOverdue > 60) score += 30;
    else if (daysOverdue > 30) score += 20;
    else if (daysOverdue > 0) score += 10;

    // Amount factor (0-25 pts): higher amounts = higher risk
    if (inv.amount > 50000) score += 25;
    else if (inv.amount > 20000) score += 15;
    else if (inv.amount > 5000) score += 10;
    else score += 5;

    // Client history factor (0-35 pts)
    score += Math.round(lateRatio * 35);

    const factors = [];
    if (daysOverdue > 0) factors.push(`${daysOverdue} days overdue`);
    if (lateRatio > 0.3) factors.push(`Client has ${Math.round(lateRatio * 100)}% late payment history`);
    if (inv.amount > 20000) factors.push('High-value invoice');
    if (factors.length === 0) factors.push('Not yet due');

    return {
      invoiceId: inv._id,
      clientName: inv.clientName,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      daysOverdue,
      riskScore: Math.min(100, score),
      factors,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Loan Stress Test — impact of interest rate increases
 */
async function getLoanStressTest(rateIncrease = 1) {
  const loans = await Loan.find();

  const results = loans.map((loan) => {
    // Simple approximation: monthly payment scales roughly with rate increase
    const currentRate = loan.interestRate / 100 / 12;
    const stressedRate = (loan.interestRate + rateIncrease) / 100 / 12;
    const n = loan.duration;

    // Calculate stressed monthly payment using amortization formula
    let stressedPayment;
    if (stressedRate === 0) {
      stressedPayment = loan.amount / n;
    } else {
      stressedPayment = (loan.amount * stressedRate * Math.pow(1 + stressedRate, n)) /
        (Math.pow(1 + stressedRate, n) - 1);
    }
    stressedPayment = Math.round(stressedPayment * 100) / 100;

    return {
      loanId: loan._id,
      amount: loan.amount,
      currentRate: loan.interestRate,
      stressedRate: loan.interestRate + rateIncrease,
      currentPayment: loan.monthlyPayment,
      stressedPayment,
      increase: Math.round((stressedPayment - loan.monthlyPayment) * 100) / 100,
      percentIncrease: Math.round(((stressedPayment - loan.monthlyPayment) / loan.monthlyPayment) * 100 * 10) / 10,
    };
  });

  const totalCurrent = results.reduce((s, r) => s + r.currentPayment, 0);
  const totalStressed = results.reduce((s, r) => s + r.stressedPayment, 0);

  return {
    rateIncreaseApplied: rateIncrease,
    loans: results,
    totals: {
      totalCurrentPayment: Math.round(totalCurrent),
      totalStressedPayment: Math.round(totalStressed),
      additionalBurden: Math.round(totalStressed - totalCurrent),
    },
  };
}

/**
 * Asset Depreciation Projection — values over N years
 */
async function getAssetDepreciation(years = 5) {
  const assets = await Asset.find();

  return assets.map((asset) => {
    const projections = [];
    let currentValue = asset.value;

    for (let year = 1; year <= years; year++) {
      currentValue = currentValue * (1 - asset.depreciationRate / 100);
      projections.push({
        year,
        value: Math.round(currentValue * 100) / 100,
        cumulativeDepreciation: Math.round((asset.value - currentValue) * 100) / 100,
      });
    }

    return {
      assetId: asset._id,
      name: asset.name,
      currentValue: asset.value,
      depreciationRate: asset.depreciationRate,
      projections,
      valueAfterPeriod: projections[projections.length - 1]?.value || asset.value,
      totalDepreciation: Math.round((asset.value - (projections[projections.length - 1]?.value || asset.value)) * 100) / 100,
    };
  });
}

module.exports = { getInvoiceRiskScores, getLoanStressTest, getAssetDepreciation };
