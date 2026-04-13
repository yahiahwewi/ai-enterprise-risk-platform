const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Asset = require('../models/Asset');

// ────────────────────────────────────────────────────────
// HELPER: Trend Analysis (last 30 days vs previous 30 days)
// ────────────────────────────────────────────────────────
function computeTrends(transactions) {
  const now = new Date();
  const d30 = new Date(now - 30 * 86400000);
  const d60 = new Date(now - 60 * 86400000);

  const recent = transactions.filter((t) => new Date(t.date) >= d30);
  const previous = transactions.filter((t) => new Date(t.date) >= d60 && new Date(t.date) < d30);

  const sum = (arr, type) => arr.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

  const recentIncome = sum(recent, 'income');
  const previousIncome = sum(previous, 'income');
  const recentExpenses = sum(recent, 'expense');
  const previousExpenses = sum(previous, 'expense');

  const pctChange = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));

  return {
    income: { current: recentIncome, previous: previousIncome, change: pctChange(recentIncome, previousIncome) },
    expenses: { current: recentExpenses, previous: previousExpenses, change: pctChange(recentExpenses, previousExpenses) },
    cashFlow: {
      current: recentIncome - recentExpenses,
      previous: previousIncome - previousExpenses,
      change: pctChange(recentIncome - recentExpenses, previousIncome - previousExpenses),
    },
  };
}

// ────────────────────────────────────────────────────────
// HELPER: Anomaly Detection (>2 std deviations per category)
// ────────────────────────────────────────────────────────
function detectAnomalies(transactions) {
  const byCategory = {};
  transactions.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });

  const anomalies = [];

  Object.entries(byCategory).forEach(([category, txns]) => {
    if (txns.length < 3) return; // Need minimum data

    const amounts = txns.map((t) => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return; // All same values

    txns.forEach((t) => {
      const deviations = Math.abs(t.amount - mean) / stddev;
      if (deviations > 2) {
        anomalies.push({
          transactionId: t._id,
          category,
          type: t.type,
          amount: t.amount,
          date: t.date,
          description: t.description,
          mean: Math.round(mean),
          stddev: Math.round(stddev),
          deviations: Math.round(deviations * 10) / 10,
          direction: t.amount > mean ? 'above' : 'below',
        });
      }
    });
  });

  return anomalies;
}

// ────────────────────────────────────────────────────────
// HELPER: Cash Flow Forecast (30 & 60 days)
// ────────────────────────────────────────────────────────
function forecastCashFlow(transactions, invoices, loans) {
  const now = new Date();
  const d30 = new Date(now - 30 * 86400000);

  // Estimate monthly income and expenses from recent data
  const recent = transactions.filter((t) => new Date(t.date) >= d30);
  const recentIncome = recent.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const recentExpenses = recent.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Pending invoices expected to come in
  const pending30 = invoices
    .filter((i) => i.status === 'pending' && new Date(i.dueDate) <= new Date(now.getTime() + 30 * 86400000))
    .reduce((s, i) => s + i.amount, 0);

  const pending60 = invoices
    .filter((i) => i.status === 'pending' && new Date(i.dueDate) <= new Date(now.getTime() + 60 * 86400000))
    .reduce((s, i) => s + i.amount, 0);

  // Monthly loan obligations
  const monthlyLoanPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  const forecast30 = recentIncome + pending30 - recentExpenses - monthlyLoanPayments;
  const forecast60 = (recentIncome * 2) + pending60 - (recentExpenses * 2) - (monthlyLoanPayments * 2);

  return {
    forecast30Days: Math.round(forecast30),
    forecast60Days: Math.round(forecast60),
    breakdown: {
      projectedIncome: recentIncome,
      projectedExpenses: recentExpenses,
      pendingInvoiceInflow30: pending30,
      pendingInvoiceInflow60: pending60,
      monthlyLoanPayments,
    },
  };
}

// ────────────────────────────────────────────────────────
// HELPER: Confidence Score (0-100)
// ────────────────────────────────────────────────────────
function computeConfidence(transactions, invoices, loans, assets) {
  const totalRecords = transactions.length + invoices.length + loans.length + assets.length;

  // Volume score (0-40)
  let volumeScore;
  if (totalRecords < 5) volumeScore = 5;
  else if (totalRecords < 20) volumeScore = 15;
  else if (totalRecords < 50) volumeScore = 25;
  else volumeScore = 40;

  // Recency score (0-30): how recent is the latest transaction
  let recencyScore = 5;
  if (transactions.length > 0) {
    const latest = Math.max(...transactions.map((t) => new Date(t.date).getTime()));
    const daysSince = (Date.now() - latest) / 86400000;
    if (daysSince < 7) recencyScore = 30;
    else if (daysSince < 30) recencyScore = 20;
    else if (daysSince < 90) recencyScore = 10;
  }

  // Consistency score (0-30): data in each of last 3 months
  let consistencyScore = 0;
  const now = new Date();
  for (let m = 0; m < 3; m++) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
    const hasData = transactions.some((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
    if (hasData) consistencyScore += 10;
  }

  return Math.min(100, volumeScore + recencyScore + consistencyScore);
}

// ────────────────────────────────────────────────────────
// HELPER: Smart Explanations
// ────────────────────────────────────────────────────────
function generateSmartExplanations(scores, metrics, trends, anomalies) {
  const explanations = [];
  const fmt = (n) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';

  // Cash flow explanation with trend context
  if (scores.cashFlowRisk >= 70) {
    let trendNote = '';
    if (trends.cashFlow.change < -10) trendNote = ' This represents a worsening trend from the previous period.';
    else if (trends.cashFlow.change > 10) trendNote = ' However, the trend shows improvement compared to last period.';
    explanations.push(
      `Your expenses (${fmt(metrics.totalExpenses)}) are ${metrics.totalExpenses > metrics.totalIncome ? 'exceeding' : 'approaching'} your income (${fmt(metrics.totalIncome)}), putting cash flow under significant pressure.${trendNote}`
    );
  } else if (scores.cashFlowRisk >= 40) {
    explanations.push(
      `Cash flow is positive at ${fmt(metrics.cashFlow)}, but the margin is thin. Your expense-to-income ratio of ${((metrics.totalExpenses / (metrics.totalIncome || 1)) * 100).toFixed(0)}% leaves limited buffer.`
    );
  }

  // Invoice explanation
  if (scores.invoiceRisk >= 50) {
    const unpaidPct = metrics.totalInvoices > 0 ? Math.round((metrics.unpaidInvoices / metrics.totalInvoices) * 100) : 0;
    explanations.push(
      `${unpaidPct}% of your invoiced revenue (${fmt(metrics.unpaidInvoices)}) remains uncollected. Late invoices total ${fmt(metrics.lateInvoices)}, increasing bad debt risk.`
    );
  }

  // Debt explanation
  if (scores.debtRisk >= 60) {
    const ratio = metrics.totalAssetValue > 0 ? (metrics.totalDebt / metrics.totalAssetValue).toFixed(1) : 'N/A';
    explanations.push(
      `Total debt of ${fmt(metrics.totalDebt)} against assets of ${fmt(metrics.totalAssetValue)} gives a debt-to-asset ratio of ${ratio}x, indicating high leverage.`
    );
  }

  // Loan burden explanation
  if (scores.loanBurdenRisk >= 50) {
    const monthly = metrics.totalIncome / 12;
    const pct = monthly > 0 ? Math.round((metrics.monthlyLoanPayments / monthly) * 100) : 100;
    explanations.push(
      `Monthly loan payments of ${fmt(metrics.monthlyLoanPayments)} consume ${pct}% of estimated monthly income, limiting operational flexibility.`
    );
  }

  // Anomaly mention
  if (anomalies.length > 0) {
    explanations.push(
      `${anomalies.length} unusual transaction(s) detected that deviate significantly from normal patterns. Review the anomaly report for details.`
    );
  }

  if (explanations.length === 0) {
    explanations.push('All financial indicators are within healthy ranges. Your company demonstrates solid financial discipline.');
  }

  return explanations;
}

// ────────────────────────────────────────────────────────
// MAIN: analyzeRisk() — single company, no scoping needed
// ────────────────────────────────────────────────────────
async function analyzeRisk() {
  const [transactions, invoices, loans, assets] = await Promise.all([
    Transaction.find(),
    Invoice.find(),
    Loan.find(),
    Asset.find(),
  ]);

  // ── Aggregate financial metrics ──────────────────────
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cashFlow = totalIncome - totalExpenses;

  const totalInvoices = invoices.reduce((s, i) => s + i.amount, 0);
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const lateInvoices = invoices.filter((i) => i.status === 'late').reduce((s, i) => s + i.amount, 0);
  const lateInvoicesList = invoices.filter((i) => i.status === 'late');

  const totalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const monthlyLoanPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalAssetValue = assets.reduce((s, a) => s + a.value, 0);

  // ── If database is empty, return neutral zeros ───────
  const hasData = transactions.length > 0 || invoices.length > 0 || loans.length > 0 || assets.length > 0;
  if (!hasData) {
    const emptyMetrics = { totalIncome: 0, totalExpenses: 0, cashFlow: 0, totalInvoices: 0, unpaidInvoices: 0, lateInvoices: 0, totalDebt: 0, monthlyLoanPayments: 0, totalAssetValue: 0 };
    const emptyBreakdown = { cashFlow: { score: 0, weight: '35%' }, invoices: { score: 0, weight: '25%' }, debt: { score: 0, weight: '25%' }, loanBurden: { score: 0, weight: '15%' } };
    return {
      globalScore: 0, level: 'low', confidence: 0,
      breakdown: emptyBreakdown, metrics: emptyMetrics,
      trends: { income: { current: 0, previous: 0, change: 0 }, expenses: { current: 0, previous: 0, change: 0 }, cashFlow: { current: 0, previous: 0, change: 0 } },
      anomalies: [], forecast: { forecast30Days: 0, forecast60Days: 0, breakdown: { projectedIncome: 0, projectedExpenses: 0, pendingInvoiceInflow30: 0, pendingInvoiceInflow60: 0, monthlyLoanPayments: 0 } },
      explanations: ['No financial data available. Add transactions, invoices, loans or assets to generate a risk analysis.'],
      predictions: ['Insufficient data for predictions.'],
      recommendations: ['Start by adding financial data to the system.'],
      lateInvoicesList: [],
    };
  }

  // ── Individual risk scores (0-100) ───────────────────
  let cashFlowRisk = 0;
  if (totalIncome === 0) {
    cashFlowRisk = 80;
  } else {
    const ratio = totalExpenses / totalIncome;
    if (ratio > 1.2) cashFlowRisk = 95;
    else if (ratio > 1.0) cashFlowRisk = 75;
    else if (ratio > 0.8) cashFlowRisk = 40;
    else cashFlowRisk = 15;
  }

  let invoiceRisk = 0;
  if (totalInvoices === 0) {
    invoiceRisk = 10;
  } else {
    const unpaidRatio = unpaidInvoices / totalInvoices;
    const lateRatio = lateInvoices / totalInvoices;
    invoiceRisk = Math.min(100, Math.round(unpaidRatio * 60 + lateRatio * 40));
  }

  let debtRisk = 0;
  if (totalDebt === 0) {
    debtRisk = 5;
  } else if (totalAssetValue === 0) {
    debtRisk = 90;
  } else {
    const debtToAsset = totalDebt / totalAssetValue;
    if (debtToAsset > 2.0) debtRisk = 95;
    else if (debtToAsset > 1.0) debtRisk = 70;
    else if (debtToAsset > 0.5) debtRisk = 40;
    else debtRisk = 15;
  }

  let loanBurdenRisk = 0;
  const monthlyIncome = totalIncome / 12 || 0;
  if (monthlyIncome === 0 && monthlyLoanPayments > 0) {
    loanBurdenRisk = 95;
  } else if (monthlyIncome > 0) {
    const burdenRatio = monthlyLoanPayments / monthlyIncome;
    if (burdenRatio > 0.5) loanBurdenRisk = 90;
    else if (burdenRatio > 0.3) loanBurdenRisk = 60;
    else if (burdenRatio > 0.15) loanBurdenRisk = 30;
    else loanBurdenRisk = 10;
  }

  // ── Weighted global score ────────────────────────────
  const globalScore = Math.round(
    cashFlowRisk * 0.35 + invoiceRisk * 0.25 + debtRisk * 0.25 + loanBurdenRisk * 0.15
  );

  let level;
  if (globalScore >= 75) level = 'critical';
  else if (globalScore >= 50) level = 'high';
  else if (globalScore >= 25) level = 'moderate';
  else level = 'low';

  // ── Advanced analytics ───────────────────────────────
  const trends = computeTrends(transactions);
  const anomalies = detectAnomalies(transactions);
  const forecast = forecastCashFlow(transactions, invoices, loans);
  const confidence = computeConfidence(transactions, invoices, loans, assets);

  const scores = { cashFlowRisk, invoiceRisk, debtRisk, loanBurdenRisk };
  const metrics = {
    totalIncome, totalExpenses, cashFlow,
    totalInvoices, unpaidInvoices, lateInvoices,
    totalDebt, monthlyLoanPayments, totalAssetValue,
  };

  // ── Smart explanations ───────────────────────────────
  const explanations = generateSmartExplanations(scores, metrics, trends, anomalies);

  // ── Predictions ──────────────────────────────────────
  const predictions = [];
  if (cashFlow < 0) {
    const burnRate = Math.abs(cashFlow);
    predictions.push(`At the current burn rate of ${burnRate.toLocaleString()} TND, cash reserves may be depleted within 3-6 months without intervention.`);
  }
  if (forecast.forecast30Days < 0) {
    predictions.push(`30-day cash flow forecast is negative (${forecast.forecast30Days.toLocaleString()} TND). Short-term liquidity risk is elevated.`);
  }
  if (lateInvoices > totalInvoices * 0.2) {
    predictions.push('Late invoice rate exceeds 20%, suggesting potential bad debt write-offs next quarter.');
  }
  if (monthlyLoanPayments > monthlyIncome * 0.4) {
    predictions.push('Loan payments exceed 40% of monthly income. Refinancing or additional capital may become necessary.');
  }
  if (trends.expenses.change > 20) {
    predictions.push(`Expenses increased ${trends.expenses.change}% compared to last period. If this trend continues, margins will compress further.`);
  }
  if (predictions.length === 0) {
    predictions.push('Current trajectory is stable with low probability of financial distress in the near term.');
  }

  // ── Recommendations ──────────────────────────────────
  const recommendations = [];
  if (cashFlowRisk >= 50) recommendations.push('Prioritize cost reduction in non-essential categories and actively pursue new revenue channels.');
  if (invoiceRisk >= 40) recommendations.push('Implement automated invoice follow-ups with escalation workflows. Consider offering 2-5% early payment discounts.');
  if (debtRisk >= 50) recommendations.push('Explore debt consolidation or restructuring. Consider acquiring productive assets to improve the debt-to-asset ratio.');
  if (loanBurdenRisk >= 40) recommendations.push('Negotiate with lenders for lower rates or extended terms. Prioritize paying down highest-interest loans first.');
  if (anomalies.length > 0) recommendations.push('Review flagged anomalous transactions to rule out errors or unauthorized spending.');
  if (trends.expenses.change > 15) recommendations.push(`Investigate the ${trends.expenses.change}% increase in expenses — identify which categories are driving the rise.`);
  if (recommendations.length === 0) recommendations.push('Continue monitoring KPIs regularly and maintain current financial discipline.');

  // ── Root Causes ───────────────────────────────────────
  const rootCauses = [];
  if (invoiceRisk > 20) {
    const lateNames = lateInvoicesList.slice(0, 3).map(i => i.clientName).join(', ');
    rootCauses.push({ cause: `Invoice delays${lateNames ? ` (${lateNames})` : ''}`, contribution: Math.round(invoiceRisk * 0.25), dimension: 'invoices' });
  }
  if (cashFlowRisk > 20) {
    // Find highest expense category
    const catTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    rootCauses.push({ cause: `High expenses${topCat ? ` in ${topCat[0]} (${topCat[1].toLocaleString()} TND)` : ''}`, contribution: Math.round(cashFlowRisk * 0.35), dimension: 'cashFlow' });
  }
  if (debtRisk > 20) {
    rootCauses.push({ cause: `Debt-to-asset ratio at ${(totalDebt / Math.max(totalAssetValue, 1)).toFixed(2)}x`, contribution: Math.round(debtRisk * 0.25), dimension: 'debt' });
  }
  if (loanBurdenRisk > 20) {
    rootCauses.push({ cause: `Monthly loan payments of ${monthlyLoanPayments.toLocaleString()} TND`, contribution: Math.round(loanBurdenRisk * 0.15), dimension: 'loanBurden' });
  }
  anomalies.slice(0, 2).forEach(a => {
    rootCauses.push({ cause: `Anomaly: ${a.category} ${a.amount.toLocaleString()} TND (${a.deviations}x normal)`, contribution: 5, dimension: 'cashFlow' });
  });
  rootCauses.sort((a, b) => b.contribution - a.contribution);

  return {
    globalScore,
    level,
    confidence,
    breakdown: {
      cashFlow: { score: cashFlowRisk, weight: '35%' },
      invoices: { score: invoiceRisk, weight: '25%' },
      debt: { score: debtRisk, weight: '25%' },
      loanBurden: { score: loanBurdenRisk, weight: '15%' },
    },
    metrics,
    trends,
    anomalies,
    forecast,
    explanations,
    predictions,
    recommendations,
    rootCauses,
    lateInvoicesList,
  };
}

module.exports = { analyzeRisk };
