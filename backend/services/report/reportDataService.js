/**
 * Report Data Service
 *
 * Aggregates ALL financial + AI data into a single structured object
 * that feeds the PDF template. This is the data pipeline:
 *
 * MongoDB collections → aiService → decisionEngine → forecastService
 *     ↓                    ↓              ↓               ↓
 *     └──────────── reportDataService ────────────────────┘
 *                          ↓
 *                   Structured Report Data
 *                          ↓
 *                   HTML Template → Puppeteer → PDF
 */

const { analyzeRisk } = require('../aiService');
const { generateFinalDecision } = require('../decisionEngine');
const { getInvoiceRiskScores, getLoanStressTest, getAssetDepreciation } = require('../forecastService');
const Transaction = require('../../models/Transaction');
const Invoice = require('../../models/Invoice');
const Loan = require('../../models/Loan');
const Asset = require('../../models/Asset');
const Company = require('../../models/Company');
const User = require('../../models/User');

async function buildReportData(companyId, language = 'fr') {
  // Fetch all data in parallel
  const [
    company,
    owner,
    riskReport,
    decisionResult,
    invoiceRisks,
    loanStress,
    assetProjections,
    transactions,
    invoices,
    loans,
    assets,
  ] = await Promise.all([
    Company.findById(companyId),
    User.findOne({ companyId, role: 'owner' }).select('name email'),
    analyzeRisk(companyId),
    generateFinalDecision(companyId),
    getInvoiceRiskScores(companyId),
    getLoanStressTest(companyId, 2),
    getAssetDepreciation(companyId, 5),
    Transaction.find({ companyId }).sort({ date: -1 }),
    Invoice.find({ companyId }),
    Loan.find({ companyId }),
    Asset.find({ companyId }),
  ]);

  const now = new Date();
  const monthNames = {
    fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  };

  // Invoice stats
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const lateInvoices = invoices.filter(i => i.status === 'late');
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCollected = paidInvoices.reduce((s, i) => s + i.amount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Recent transactions (last 30 days)
  const d30 = new Date(now - 30 * 86400000);
  const recentTx = transactions.filter(t => new Date(t.date) >= d30);
  const recentIncome = recentTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const recentExpenses = recentTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Top expense categories
  const categoryMap = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const topExpenses = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // Total assets value
  const totalAssetValue = assets.reduce((s, a) => s + a.value, 0);
  const totalDebt = loans.reduce((s, l) => s + l.amount, 0);

  return {
    // Meta
    generatedAt: now.toISOString(),
    language,
    period: `${monthNames[language][now.getMonth()]} ${now.getFullYear()}`,
    periodCode: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,

    // Company
    company: {
      name: company?.name || 'Tac-Tic',
      owner: owner?.name || 'N/A',
      ownerEmail: owner?.email || '',
    },

    // AI Decision
    decision: {
      decision: decisionResult.decision,
      decisionColor: decisionResult.decisionColor,
      summary: decisionResult.summary,
      businessImpact: decisionResult.businessImpact,
      priorityActions: decisionResult.priorityActions,
    },

    // Risk Score
    risk: {
      globalScore: riskReport.globalScore,
      level: riskReport.level,
      confidence: riskReport.confidence,
      breakdown: riskReport.breakdown,
    },

    // KPIs
    kpis: {
      totalIncome: riskReport.metrics.totalIncome,
      totalExpenses: riskReport.metrics.totalExpenses,
      cashFlow: riskReport.metrics.cashFlow,
      recentIncome,
      recentExpenses,
      totalDebt,
      totalAssetValue,
      debtToAssetRatio: totalAssetValue > 0 ? (totalDebt / totalAssetValue).toFixed(2) : 'N/A',
      monthlyLoanPayments: riskReport.metrics.monthlyLoanPayments,
      collectionRate,
      totalInvoiced,
      invoicesPaid: paidInvoices.length,
      invoicesPending: pendingInvoices.length,
      invoicesLate: lateInvoices.length,
    },

    // Trends
    trends: riskReport.trends,

    // Anomalies
    anomalies: riskReport.anomalies,

    // Forecasts
    forecast: riskReport.forecast,

    // Invoice risk details
    invoiceRisks: invoiceRisks.slice(0, 10),

    // Loan stress test
    loanStress,

    // Asset projections
    assetProjections: assetProjections.slice(0, 5),

    // Top expenses
    topExpenses,

    // Recommendations
    recommendations: riskReport.recommendations,
    predictions: riskReport.predictions,
    explanations: riskReport.explanations,

    // Counts
    counts: {
      transactions: transactions.length,
      invoices: invoices.length,
      loans: loans.length,
      assets: assets.length,
    },
  };
}

module.exports = { buildReportData };
