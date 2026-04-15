const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Asset = require('../models/Asset');

// ─────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────
const TEXT = {
  fr: {
    noData: 'Aucune donnée financière disponible. Ajoutez des transactions, factures, prêts ou actifs pour générer une analyse de risque.',
    insufficientPrediction: 'Données insuffisantes pour générer des prédictions.',
    insufficientReco: 'Commencez par saisir des données financières dans le système.',
    // Cash flow explanations
    expensesExceeding: (exp, inc) => `Vos dépenses (${exp}) dépassent vos revenus (${inc}), mettant la trésorerie sous pression significative.`,
    expensesApproaching: (exp, inc) => `Vos dépenses (${exp}) se rapprochent de vos revenus (${inc}), mettant la trésorerie sous pression significative.`,
    expensesTrendWorsen: ' La tendance s\'est dégradée par rapport à la période précédente.',
    expensesTrendImprove: ' La tendance montre cependant une amélioration par rapport à la période précédente.',
    cashFlowThin: (cf, ratio) => `La trésorerie est positive à ${cf}, mais la marge est étroite. Votre ratio dépenses/revenus de ${ratio}% laisse peu de tampon.`,
    noTransactionData: 'Aucune transaction enregistrée. Impossible d\'évaluer le flux de trésorerie.',
    // Invoice explanations
    invoiceUnpaid: (pct, unpaid, late) => `${pct}% de vos revenus facturés (${unpaid}) restent non encaissés. Les factures en retard totalisent ${late}, augmentant le risque de créances douteuses.`,
    // Debt explanations
    debtRatio: (debt, assets, ratio) => `La dette totale de ${debt} face à des actifs de ${assets} donne un ratio d'endettement de ${ratio}x, indiquant un fort levier financier.`,
    // Loan burden explanations
    loanBurden: (payment, pct) => `Les remboursements mensuels de prêts (${payment}) représentent ${pct}% du revenu mensuel estimé, limitant la flexibilité opérationnelle.`,
    loanNoIncome: (payment) => `Les remboursements mensuels de prêts (${payment}) ne peuvent pas être évalués faute de données de revenus.`,
    // Anomaly
    anomalies: (n) => `${n} transaction(s) inhabituelle(s) détectée(s) s'écartant significativement des schémas normaux. Consultez le rapport d'anomalies pour plus de détails.`,
    // All good
    allGood: 'Tous les indicateurs financiers sont dans des plages saines. Votre entreprise fait preuve d\'une solide discipline financière.',
    // Predictions
    burnRate: (rate) => `Au rythme de consommation actuel de ${rate} TND, les réserves de trésorerie pourraient s'épuiser dans 3 à 6 mois sans intervention.`,
    forecast30Neg: (v) => `La prévision de trésorerie à 30 jours est négative (${v} TND). Le risque de liquidité à court terme est élevé.`,
    lateInvoiceRate: 'Le taux de factures en retard dépasse 20%, suggérant de potentielles provisions pour créances douteuses au prochain trimestre.',
    loanPaymentHigh: 'Les remboursements de prêts dépassent 40% du revenu mensuel. Un refinancement ou des capitaux supplémentaires pourraient devenir nécessaires.',
    expenseTrend: (pct) => `Les dépenses ont augmenté de ${pct}% par rapport à la période précédente. Si cette tendance persiste, les marges se comprimeront davantage.`,
    stable: 'La trajectoire actuelle est stable avec une faible probabilité de difficultés financières à court terme.',
    // Recommendations
    recoCashFlow: 'Prioriser la réduction des coûts dans les catégories non essentielles et développer activement de nouvelles sources de revenus.',
    recoInvoices: 'Mettre en place des relances automatiques de factures avec des workflows d\'escalade. Envisager des remises de 2 à 5% pour paiements anticipés.',
    recoDebt: 'Étudier la consolidation ou la restructuration de la dette. Envisager l\'acquisition d\'actifs productifs pour améliorer le ratio d\'endettement.',
    recoLoans: 'Négocier avec les prêteurs des taux plus bas ou des durées plus longues. Prioriser le remboursement des prêts aux taux les plus élevés.',
    recoAnomalies: 'Examiner les transactions anormales signalées pour écarter les erreurs ou les dépenses non autorisées.',
    recoExpTrend: (pct) => `Investiguer l'augmentation de ${pct}% des dépenses — identifier quelles catégories en sont responsables.`,
    recoDefault: 'Continuer à surveiller les KPIs régulièrement et maintenir la discipline financière actuelle.',
    // Root causes
    rootInvoice: (names) => `Retards de facturation${names ? ` (${names})` : ''}`,
    rootCashFlow: (cat, amt) => `Dépenses élevées${cat ? ` en ${cat} (${amt} TND)` : ''}`,
    rootDebt: (ratio) => `Ratio d'endettement à ${ratio}x`,
    rootLoan: (payment) => `Remboursements mensuels de ${payment} TND`,
    rootAnomaly: (cat, amt, dev) => `Anomalie : ${cat} ${amt} TND (${dev}x la normale)`,
  },
  en: {
    noData: 'No financial data available. Add transactions, invoices, loans or assets to generate a risk analysis.',
    insufficientPrediction: 'Insufficient data for predictions.',
    insufficientReco: 'Start by adding financial data to the system.',
    expensesExceeding: (exp, inc) => `Your expenses (${exp}) are exceeding your income (${inc}), putting cash flow under significant pressure.`,
    expensesApproaching: (exp, inc) => `Your expenses (${exp}) are approaching your income (${inc}), putting cash flow under significant pressure.`,
    expensesTrendWorsen: ' This represents a worsening trend from the previous period.',
    expensesTrendImprove: ' However, the trend shows improvement compared to last period.',
    cashFlowThin: (cf, ratio) => `Cash flow is positive at ${cf}, but the margin is thin. Your expense-to-income ratio of ${ratio}% leaves limited buffer.`,
    noTransactionData: 'No transactions recorded. Unable to evaluate cash flow.',
    invoiceUnpaid: (pct, unpaid, late) => `${pct}% of your invoiced revenue (${unpaid}) remains uncollected. Late invoices total ${late}, increasing bad debt risk.`,
    debtRatio: (debt, assets, ratio) => `Total debt of ${debt} against assets of ${assets} gives a debt-to-asset ratio of ${ratio}x, indicating high leverage.`,
    loanBurden: (payment, pct) => `Monthly loan payments of ${payment} consume ${pct}% of estimated monthly income, limiting operational flexibility.`,
    loanNoIncome: (payment) => `Monthly loan payments of ${payment} cannot be assessed due to missing income data.`,
    anomalies: (n) => `${n} unusual transaction(s) detected that deviate significantly from normal patterns. Review the anomaly report for details.`,
    allGood: 'All financial indicators are within healthy ranges. Your company demonstrates solid financial discipline.',
    burnRate: (rate) => `At the current burn rate of ${rate} TND, cash reserves may be depleted within 3-6 months without intervention.`,
    forecast30Neg: (v) => `30-day cash flow forecast is negative (${v} TND). Short-term liquidity risk is elevated.`,
    lateInvoiceRate: 'Late invoice rate exceeds 20%, suggesting potential bad debt write-offs next quarter.',
    loanPaymentHigh: 'Loan payments exceed 40% of monthly income. Refinancing or additional capital may become necessary.',
    expenseTrend: (pct) => `Expenses increased ${pct}% compared to last period. If this trend continues, margins will compress further.`,
    stable: 'Current trajectory is stable with low probability of financial distress in the near term.',
    recoCashFlow: 'Prioritize cost reduction in non-essential categories and actively pursue new revenue channels.',
    recoInvoices: 'Implement automated invoice follow-ups with escalation workflows. Consider offering 2-5% early payment discounts.',
    recoDebt: 'Explore debt consolidation or restructuring. Consider acquiring productive assets to improve the debt-to-asset ratio.',
    recoLoans: 'Negotiate with lenders for lower rates or extended terms. Prioritize paying down highest-interest loans first.',
    recoAnomalies: 'Review flagged anomalous transactions to rule out errors or unauthorized spending.',
    recoExpTrend: (pct) => `Investigate the ${pct}% increase in expenses — identify which categories are driving the rise.`,
    recoDefault: 'Continue monitoring KPIs regularly and maintain current financial discipline.',
    rootInvoice: (names) => `Invoice delays${names ? ` (${names})` : ''}`,
    rootCashFlow: (cat, amt) => `High expenses${cat ? ` in ${cat} (${amt} TND)` : ''}`,
    rootDebt: (ratio) => `Debt-to-asset ratio at ${ratio}x`,
    rootLoan: (payment) => `Monthly loan payments of ${payment} TND`,
    rootAnomaly: (cat, amt, dev) => `Anomaly: ${cat} ${amt} TND (${dev}x normal)`,
  },
};

// ────────────────────────────────────────────────────────
// HELPER: Format number as TND
// ────────────────────────────────────────────────────────
function fmt(n) {
  return Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
}

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
    if (txns.length < 3) return;

    const amounts = txns.map((t) => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) return;

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

  const recent = transactions.filter((t) => new Date(t.date) >= d30);
  const recentIncome = recent.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const recentExpenses = recent.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const pending30 = invoices
    .filter((i) => i.status === 'pending' && new Date(i.dueDate) <= new Date(now.getTime() + 30 * 86400000))
    .reduce((s, i) => s + i.amount, 0);

  const pending60 = invoices
    .filter((i) => i.status === 'pending' && new Date(i.dueDate) <= new Date(now.getTime() + 60 * 86400000))
    .reduce((s, i) => s + i.amount, 0);

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

  let volumeScore;
  if (totalRecords < 5) volumeScore = 5;
  else if (totalRecords < 20) volumeScore = 15;
  else if (totalRecords < 50) volumeScore = 25;
  else volumeScore = 40;

  let recencyScore = 5;
  if (transactions.length > 0) {
    const latest = Math.max(...transactions.map((t) => new Date(t.date).getTime()));
    const daysSince = (Date.now() - latest) / 86400000;
    if (daysSince < 7) recencyScore = 30;
    else if (daysSince < 30) recencyScore = 20;
    else if (daysSince < 90) recencyScore = 10;
  }

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
// HELPER: Smart Explanations (fully bilingual)
// ────────────────────────────────────────────────────────
function generateSmartExplanations(scores, metrics, trends, anomalies, transactions, language) {
  const t = TEXT[language] || TEXT.fr;
  const explanations = [];

  if (transactions.length === 0) {
    explanations.push(t.noTransactionData);
  } else if (scores.cashFlowRisk >= 70) {
    let msg = metrics.totalExpenses > metrics.totalIncome
      ? t.expensesExceeding(fmt(metrics.totalExpenses), fmt(metrics.totalIncome))
      : t.expensesApproaching(fmt(metrics.totalExpenses), fmt(metrics.totalIncome));
    if (trends.cashFlow.change < -10) msg += t.expensesTrendWorsen;
    else if (trends.cashFlow.change > 10) msg += t.expensesTrendImprove;
    explanations.push(msg);
  } else if (scores.cashFlowRisk >= 40) {
    const ratio = ((metrics.totalExpenses / (metrics.totalIncome || 1)) * 100).toFixed(0);
    explanations.push(t.cashFlowThin(fmt(metrics.cashFlow), ratio));
  }

  if (scores.invoiceRisk >= 50) {
    const unpaidPct = metrics.totalInvoices > 0
      ? Math.round((metrics.unpaidInvoices / metrics.totalInvoices) * 100)
      : 0;
    explanations.push(t.invoiceUnpaid(unpaidPct, fmt(metrics.unpaidInvoices), fmt(metrics.lateInvoices)));
  }

  if (scores.debtRisk >= 60) {
    const ratio = metrics.totalAssetValue > 0
      ? (metrics.totalDebt / metrics.totalAssetValue).toFixed(1)
      : 'N/A';
    explanations.push(t.debtRatio(fmt(metrics.totalDebt), fmt(metrics.totalAssetValue), ratio));
  }

  if (scores.loanBurdenRisk >= 50) {
    if (transactions.length === 0) {
      explanations.push(t.loanNoIncome(fmt(metrics.monthlyLoanPayments)));
    } else {
      const monthly = metrics.totalIncome / 12;
      const pct = monthly > 0 ? Math.round((metrics.monthlyLoanPayments / monthly) * 100) : 100;
      explanations.push(t.loanBurden(fmt(metrics.monthlyLoanPayments), pct));
    }
  }

  if (anomalies.length > 0) {
    explanations.push(t.anomalies(anomalies.length));
  }

  if (explanations.length === 0) {
    explanations.push(t.allGood);
  }

  return explanations;
}

// ────────────────────────────────────────────────────────
// MAIN: analyzeRisk(language) — single company
// ────────────────────────────────────────────────────────
async function analyzeRisk(language = 'fr') {
  const t = TEXT[language] || TEXT.fr;

  const [transactions, invoices, loans, assets] = await Promise.all([
    Transaction.find(),
    Invoice.find(),
    Loan.find(),
    Asset.find(),
  ]);

  // ── Aggregate financial metrics ──────────────────────
  const totalIncome = transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const cashFlow = totalIncome - totalExpenses;

  const totalInvoices = invoices.reduce((s, i) => s + i.amount, 0);
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const lateInvoices = invoices.filter((i) => i.status === 'late').reduce((s, i) => s + i.amount, 0);
  const lateInvoicesList = invoices.filter((i) => i.status === 'late');

  const totalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const monthlyLoanPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalAssetValue = assets.reduce((s, a) => s + a.value, 0);

  // ── If database is completely empty, return zeros ────
  const hasData = transactions.length > 0 || invoices.length > 0 || loans.length > 0 || assets.length > 0;
  if (!hasData) {
    const emptyMetrics = { totalIncome: 0, totalExpenses: 0, cashFlow: 0, totalInvoices: 0, unpaidInvoices: 0, lateInvoices: 0, totalDebt: 0, monthlyLoanPayments: 0, totalAssetValue: 0 };
    const emptyBreakdown = {
      cashFlow: { score: 0, weight: '35%' },
      invoices: { score: 0, weight: '25%' },
      debt: { score: 0, weight: '25%' },
      loanBurden: { score: 0, weight: '15%' },
    };
    return {
      globalScore: 0, level: 'low', confidence: 0,
      breakdown: emptyBreakdown, metrics: emptyMetrics,
      trends: { income: { current: 0, previous: 0, change: 0 }, expenses: { current: 0, previous: 0, change: 0 }, cashFlow: { current: 0, previous: 0, change: 0 } },
      anomalies: [],
      forecast: { forecast30Days: 0, forecast60Days: 0, breakdown: { projectedIncome: 0, projectedExpenses: 0, pendingInvoiceInflow30: 0, pendingInvoiceInflow60: 0, monthlyLoanPayments: 0 } },
      explanations: [t.noData],
      predictions: [t.insufficientPrediction],
      recommendations: [t.insufficientReco],
      lateInvoicesList: [],
    };
  }

  // ── Individual risk scores (0-100) ───────────────────

  // Cash flow risk: only penalize heavily if we actually have transactions showing no income
  let cashFlowRisk = 0;
  if (transactions.length === 0) {
    // No transaction data at all — insufficient to assess; give moderate-neutral score
    cashFlowRisk = 20;
  } else if (totalIncome === 0) {
    // Transactions exist but all are expenses — severe
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

  // Loan burden: only penalize if we have income data showing the burden is real
  let loanBurdenRisk = 0;
  const monthlyIncome = transactions.length > 0 ? totalIncome / 12 : 0;
  if (transactions.length === 0 && monthlyLoanPayments > 0) {
    // No income data to compare against — cannot assess burden accurately
    loanBurdenRisk = 30;
  } else if (monthlyIncome === 0 && monthlyLoanPayments > 0) {
    // Has transactions but zero income — burden is maximal
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

  // ── Smart explanations (bilingual) ───────────────────
  const explanations = generateSmartExplanations(scores, metrics, trends, anomalies, transactions, language);

  // ── Predictions (bilingual) ──────────────────────────
  const predictions = [];
  if (cashFlow < 0 && transactions.length > 0) {
    predictions.push(t.burnRate(Math.abs(cashFlow).toLocaleString('fr-FR')));
  }
  if (forecast.forecast30Days < 0) {
    predictions.push(t.forecast30Neg(forecast.forecast30Days.toLocaleString('fr-FR')));
  }
  if (lateInvoices > totalInvoices * 0.2) {
    predictions.push(t.lateInvoiceRate);
  }
  if (monthlyIncome > 0 && monthlyLoanPayments > monthlyIncome * 0.4) {
    predictions.push(t.loanPaymentHigh);
  }
  if (trends.expenses.change > 20) {
    predictions.push(t.expenseTrend(trends.expenses.change));
  }
  if (predictions.length === 0) {
    predictions.push(t.stable);
  }

  // ── Recommendations (bilingual) ──────────────────────
  const recommendations = [];
  if (cashFlowRisk >= 50) recommendations.push(t.recoCashFlow);
  if (invoiceRisk >= 40) recommendations.push(t.recoInvoices);
  if (debtRisk >= 50) recommendations.push(t.recoDebt);
  if (loanBurdenRisk >= 40) recommendations.push(t.recoLoans);
  if (anomalies.length > 0) recommendations.push(t.recoAnomalies);
  if (trends.expenses.change > 15) recommendations.push(t.recoExpTrend(trends.expenses.change));
  if (recommendations.length === 0) recommendations.push(t.recoDefault);

  // ── Root Causes (bilingual) ───────────────────────────
  const rootCauses = [];
  if (invoiceRisk > 20) {
    const lateNames = lateInvoicesList.slice(0, 3).map((i) => i.clientName).join(', ');
    rootCauses.push({
      cause: t.rootInvoice(lateNames),
      contribution: Math.round(invoiceRisk * 0.25),
      dimension: 'invoices',
    });
  }
  if (cashFlowRisk > 20 && transactions.length > 0) {
    const catTotals = {};
    transactions.filter((tx) => tx.type === 'expense').forEach((tx) => {
      catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    rootCauses.push({
      cause: t.rootCashFlow(topCat ? topCat[0] : null, topCat ? topCat[1].toLocaleString('fr-FR') : ''),
      contribution: Math.round(cashFlowRisk * 0.35),
      dimension: 'cashFlow',
    });
  }
  if (debtRisk > 20) {
    rootCauses.push({
      cause: t.rootDebt((totalDebt / Math.max(totalAssetValue, 1)).toFixed(2)),
      contribution: Math.round(debtRisk * 0.25),
      dimension: 'debt',
    });
  }
  if (loanBurdenRisk > 20) {
    rootCauses.push({
      cause: t.rootLoan(monthlyLoanPayments.toLocaleString('fr-FR')),
      contribution: Math.round(loanBurdenRisk * 0.15),
      dimension: 'loanBurden',
    });
  }
  anomalies.slice(0, 2).forEach((a) => {
    rootCauses.push({
      cause: t.rootAnomaly(a.category, a.amount.toLocaleString('fr-FR'), a.deviations),
      contribution: 5,
      dimension: 'cashFlow',
    });
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
