/**
 * Scenario Simulation Engine — Enhanced "What if" analysis.
 *
 * 7 independent levers:
 *   1. incomeChange (%)          — revenue variation
 *   2. expenseChange (%)         — cost variation
 *   3. lateInvoiceCount          — additional invoices going late
 *   4. collectionImprovement (%) — recovery of late invoices (positive = better)
 *   5. rateIncrease (%)          — interest rate change on existing loans
 *   6. newLoanAmount (TND)       — new debt taken on
 *   7. assetChange (%)           — asset value variation
 */

const Transaction = require('../models/Transaction');
const Invoice     = require('../models/Invoice');
const Loan        = require('../models/Loan');
const Asset       = require('../models/Asset');

// ── amortisation formula ──────────────────────────────────
function computeMonthlyPayment(P, annualRate, n) {
  if (!P || !n) return 0;
  if (!annualRate) return Math.round((P / n) * 100) / 100;
  const r = annualRate / 100 / 12;
  return Math.round((P * r) / (1 - Math.pow(1 + r, -n)) * 100) / 100;
}

// ── per-dimension scoring — returns object ────────────────
function computeBreakdown(income, expenses, totalInv, unpaid, lateAmt, debt, assets, monthlyPay, hasTx) {
  let cashFlow;
  if (!hasTx && income === 0) cashFlow = 20;
  else if (income === 0)       cashFlow = 80;
  else {
    const r = expenses / income;
    cashFlow = r > 1.5 ? 100 : r > 1.2 ? 95 : r > 1.0 ? 75 : r > 0.8 ? 40 : r > 0.6 ? 20 : 10;
  }

  const invoices = totalInv === 0 ? 10 : Math.min(100,
    Math.round((unpaid / totalInv) * 60 + (lateAmt / totalInv) * 40)
  );

  let debtRisk;
  if (debt === 0)            debtRisk = 5;
  else if (assets === 0)     debtRisk = 90;
  else {
    const r = debt / assets;
    debtRisk = r > 3 ? 100 : r > 2 ? 95 : r > 1.5 ? 80 : r > 1 ? 70 : r > 0.5 ? 40 : r > 0.3 ? 20 : 10;
  }

  let loanBurden = 0;
  const monthlyIncome = income / 12;
  if (!hasTx && monthlyPay > 0)             loanBurden = 30;
  else if (monthlyIncome === 0 && monthlyPay > 0) loanBurden = 95;
  else if (monthlyIncome > 0) {
    const r = monthlyPay / monthlyIncome;
    loanBurden = r > 0.7 ? 100 : r > 0.5 ? 90 : r > 0.3 ? 60 : r > 0.15 ? 30 : 10;
  }

  const global = Math.round(cashFlow * 0.35 + invoices * 0.25 + debtRisk * 0.25 + loanBurden * 0.15);
  return { global, cashFlow, invoices, debt: debtRisk, loanBurden };
}

// ── impact classification ─────────────────────────────────
function classifyImpact(delta) {
  if (delta <= -20) return 'very_positive';
  if (delta < -5)   return 'positive';
  if (delta <= 5)   return 'neutral';
  if (delta <= 15)  return 'medium';
  if (delta <= 30)  return 'high';
  return 'critical';
}

// ── bilingual narrative generator ─────────────────────────
function generateNarrative(params, baseline, simulated, delta, impact) {
  const drivers = [];

  if (Math.abs(params.incomeChange) >= 5) {
    const dir = params.incomeChange > 0 ? ['hausse', 'increase'] : ['baisse', 'decrease'];
    drivers.push([
      `Une ${dir[0]} des revenus de ${Math.abs(params.incomeChange)}% modifie le flux de trésorerie de ${Math.round(baseline.income * params.incomeChange / 100).toLocaleString('fr-FR')} TND.`,
      `A ${Math.abs(params.incomeChange)}% ${dir[1]} in revenue shifts cash flow by ${Math.round(baseline.income * params.incomeChange / 100).toLocaleString('en-US')} TND.`,
    ]);
  }

  if (Math.abs(params.expenseChange) >= 5) {
    const dir = params.expenseChange > 0 ? ['hausse', 'increase'] : ['réduction', 'reduction'];
    drivers.push([
      `Une ${dir[0]} des dépenses de ${Math.abs(params.expenseChange)}% impacte directement la marge opérationnelle.`,
      `A ${Math.abs(params.expenseChange)}% expense ${dir[1]} directly impacts the operating margin.`,
    ]);
  }

  if (params.lateInvoiceCount > 0) {
    drivers.push([
      `${params.lateInvoiceCount} facture(s) supplémentaire(s) en retard augmentent le risque de créances douteuses.`,
      `${params.lateInvoiceCount} additional late invoice(s) increase bad debt exposure.`,
    ]);
  }

  if (params.collectionImprovement !== 0) {
    const dir = params.collectionImprovement > 0 ? ['amélioration', 'improvement'] : ['dégradation', 'deterioration'];
    drivers.push([
      `Une ${dir[0]} de ${Math.abs(params.collectionImprovement)}% du recouvrement modifie le profil de risque factures.`,
      `A ${Math.abs(params.collectionImprovement)}% collection rate ${dir[1]} reshapes the invoice risk profile.`,
    ]);
  }

  if (params.rateIncrease !== 0) {
    const dir = params.rateIncrease > 0 ? ['hausse', 'rise'] : ['baisse', 'drop'];
    drivers.push([
      `Une ${dir[0]} du taux d'intérêt de ${Math.abs(params.rateIncrease)}% modifie les mensualités de prêt.`,
      `A ${Math.abs(params.rateIncrease)}% interest rate ${dir[1]} reshapes monthly loan obligations.`,
    ]);
  }

  if (params.newLoanAmount > 0) {
    drivers.push([
      `Un nouveau prêt de ${params.newLoanAmount.toLocaleString('fr-FR')} TND augmente le levier financier.`,
      `A new loan of ${params.newLoanAmount.toLocaleString('en-US')} TND increases financial leverage.`,
    ]);
  }

  if (Math.abs(params.assetChange) >= 5) {
    const dir = params.assetChange > 0 ? ['acquisition', 'acquisition'] : ['cession', 'sale'];
    drivers.push([
      `Une ${dir[0]} d'actifs de ${Math.abs(params.assetChange)}% modifie le ratio d'endettement.`,
      `A ${Math.abs(params.assetChange)}% asset ${dir[1]} reshapes the debt-to-asset ratio.`,
    ]);
  }

  const conclusionFr = {
    very_positive: `Résultat : amélioration significative du score de risque (${delta} points). La situation financière serait nettement plus saine.`,
    positive:      `Résultat : légère amélioration du profil de risque (${delta} points).`,
    neutral:       `Résultat : impact négligeable sur le score global (${delta} points).`,
    medium:        `Résultat : dégradation modérée du risque (+${delta} points). Une action préventive est recommandée.`,
    high:          `Résultat : dégradation élevée du risque (+${delta} points). Des mesures correctives s'imposent rapidement.`,
    critical:      `Résultat : dégradation critique du risque (+${delta} points). Sans intervention immédiate, la viabilité financière est menacée.`,
  };
  const conclusionEn = {
    very_positive: `Result: significant risk score improvement (${delta} points). The financial situation would be substantially healthier.`,
    positive:      `Result: slight risk profile improvement (${delta} points).`,
    neutral:       `Result: negligible impact on the global score (${delta} points).`,
    medium:        `Result: moderate risk degradation (+${delta} points). Preventive action is recommended.`,
    high:          `Result: high risk degradation (+${delta} points). Corrective measures are urgently needed.`,
    critical:      `Result: critical risk degradation (+${delta} points). Without immediate intervention, financial viability is threatened.`,
  };

  return {
    fr: [...drivers.map(d => d[0]), conclusionFr[impact]].join(' '),
    en: [...drivers.map(d => d[1]), conclusionEn[impact]].join(' '),
  };
}

// ── MAIN ─────────────────────────────────────────────────
async function simulateScenario(params = {}) {
  const {
    incomeChange          = 0,   // % (-50 to +100)
    expenseChange         = 0,   // % (-50 to +100)
    lateInvoiceCount      = 0,   // count (0 to 20)
    collectionImprovement = 0,   // % (-50 to +50): positive = recover late invoices
    rateIncrease          = 0,   // % (-5 to +15)
    newLoanAmount         = 0,   // TND (0 to 500000)
    assetChange           = 0,   // % (-100 to +100)
  } = params;

  const [transactions, invoices, loans, assets] = await Promise.all([
    Transaction.find(), Invoice.find(), Loan.find(), Asset.find(),
  ]);

  const hasTx = transactions.length > 0;

  // ── Baseline metrics ──────────────────────────────────
  const baseIncome    = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const baseExpenses  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const baseTotalInv  = invoices.reduce((s, i) => s + i.amount, 0);
  const baseUnpaid    = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const baseLateAmt   = invoices.filter(i => i.status === 'late').reduce((s, i) => s + i.amount, 0);
  const baseLateCount = invoices.filter(i => i.status === 'late').length;
  const baseTotalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const baseTotalAssets = assets.reduce((s, a) => s + a.value, 0);
  const baseMonthlyPay  = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  const baseBreakdown = computeBreakdown(
    baseIncome, baseExpenses, baseTotalInv, baseUnpaid, baseLateAmt,
    baseTotalDebt, baseTotalAssets, baseMonthlyPay, hasTx
  );

  // ── Simulated metrics ─────────────────────────────────

  // 1. Income & Expense change
  const simIncome   = baseIncome   * (1 + incomeChange   / 100);
  const simExpenses = baseExpenses * (1 + expenseChange  / 100);

  // 2. Late invoices — add more going late
  const pendingInvoices = invoices
    .filter(i => i.status === 'pending')
    .sort((a, b) => b.amount - a.amount);
  const newLateCount = Math.min(lateInvoiceCount, pendingInvoices.length);
  const newLateAmt   = pendingInvoices.slice(0, newLateCount).reduce((s, i) => s + i.amount, 0);

  let simLateAmt  = baseLateAmt  + newLateAmt;
  let simUnpaid   = baseUnpaid   + newLateAmt;

  // 3. Collection improvement — recover % of late invoices (or worsen)
  if (collectionImprovement > 0) {
    // Recover portion of late invoices
    const recovered = simLateAmt * (collectionImprovement / 100);
    simLateAmt = Math.max(0, simLateAmt - recovered);
    simUnpaid  = Math.max(0, simUnpaid  - recovered);
  } else if (collectionImprovement < 0) {
    // Additional pending go late (beyond the explicit lateInvoiceCount)
    const remaining = pendingInvoices.slice(newLateCount);
    const additionalLate = remaining.reduce((s, i) => s + i.amount, 0) * (Math.abs(collectionImprovement) / 100);
    simLateAmt += additionalLate;
  }

  // 4. Interest rate change on existing loans
  let simMonthlyPay = 0;
  for (const loan of loans) {
    const newRate = Math.max(0, loan.interestRate + rateIncrease);
    simMonthlyPay += computeMonthlyPayment(loan.amount, newRate, loan.duration);
  }

  // 5. New loan
  let simTotalDebt = baseTotalDebt;
  if (newLoanAmount > 0) {
    const avgRate = loans.length > 0
      ? loans.reduce((s, l) => s + l.interestRate, 0) / loans.length
      : 10;
    const newLoanDuration = 60; // 5 years default
    simMonthlyPay += computeMonthlyPayment(newLoanAmount, Math.max(0, avgRate + rateIncrease), newLoanDuration);
    simTotalDebt  += newLoanAmount;
  }

  // 6. Asset change
  const simTotalAssets = Math.max(0, baseTotalAssets * (1 + assetChange / 100));

  const simBreakdown = computeBreakdown(
    simIncome, simExpenses, baseTotalInv, simUnpaid, simLateAmt,
    simTotalDebt, simTotalAssets, simMonthlyPay, hasTx || incomeChange !== 0 || expenseChange !== 0
  );

  // ── Delta ─────────────────────────────────────────────
  const delta = simBreakdown.global - baseBreakdown.global;
  const impact = classifyImpact(delta);

  const narrative = generateNarrative(
    { incomeChange, expenseChange, lateInvoiceCount, collectionImprovement, rateIncrease, newLoanAmount, assetChange },
    { income: baseIncome, expenses: baseExpenses },
    { income: simIncome,  expenses: simExpenses },
    delta,
    impact,
  );

  return {
    baseline: {
      score:          baseBreakdown.global,
      cashFlow:       Math.round(baseIncome - baseExpenses),
      income:         Math.round(baseIncome),
      expenses:       Math.round(baseExpenses),
      monthlyPayments: Math.round(baseMonthlyPay),
      lateInvoices:   baseLateCount,
      totalDebt:      Math.round(baseTotalDebt),
      totalAssets:    Math.round(baseTotalAssets),
      breakdown:      { cashFlow: baseBreakdown.cashFlow, invoices: baseBreakdown.invoices, debt: baseBreakdown.debt, loanBurden: baseBreakdown.loanBurden },
    },
    simulated: {
      score:          simBreakdown.global,
      cashFlow:       Math.round(simIncome - simExpenses),
      income:         Math.round(simIncome),
      expenses:       Math.round(simExpenses),
      monthlyPayments: Math.round(simMonthlyPay),
      lateInvoices:   baseLateCount + newLateCount,
      totalDebt:      Math.round(simTotalDebt),
      totalAssets:    Math.round(simTotalAssets),
      breakdown:      { cashFlow: simBreakdown.cashFlow, invoices: simBreakdown.invoices, debt: simBreakdown.debt, loanBurden: simBreakdown.loanBurden },
    },
    delta: {
      scoreChange:     delta,
      cashFlowChange:  Math.round((simIncome - simExpenses) - (baseIncome - baseExpenses)),
      paymentsChange:  Math.round(simMonthlyPay - baseMonthlyPay),
      debtChange:      Math.round(simTotalDebt - baseTotalDebt),
      assetChange:     Math.round(simTotalAssets - baseTotalAssets),
      breakdown: {
        cashFlow:   simBreakdown.cashFlow  - baseBreakdown.cashFlow,
        invoices:   simBreakdown.invoices  - baseBreakdown.invoices,
        debt:       simBreakdown.debt      - baseBreakdown.debt,
        loanBurden: simBreakdown.loanBurden - baseBreakdown.loanBurden,
      },
    },
    impact,
    params: { incomeChange, expenseChange, lateInvoiceCount, collectionImprovement, rateIncrease, newLoanAmount, assetChange },
    narrative,
  };
}

module.exports = { simulateScenario };
