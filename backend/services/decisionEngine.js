const { analyzeRisk } = require('./aiService');

// ─────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────
const TEXT = {
  fr: {
    // Summary messages
    summaryOk: (score, cf) =>
      `Votre entreprise est en bonne santé financière avec un score de risque de ${score}/100. La trésorerie est positive à ${cf}, le niveau d'endettement est gérable et le recouvrement des factures est dans les délais. Maintenir les pratiques actuelles et surveiller trimestriellement.`,
    summaryMonitor: (score, cfLabel) =>
      `Votre entreprise présente un risque financier modéré (${score}/100). Bien que non critique, certains indicateurs nécessitent une attention particulière. ${cfLabel}, et votre position financière pourrait se dégrader si les tendances actuelles persistent.`,
    summaryMonitorNegCF: 'La trésorerie est négative',
    summaryMonitorThinCF: 'Les marges de trésorerie sont étroites',
    summaryActionRequired: (score, concerns) =>
      `Votre entreprise fait face à un risque financier élevé (${score}/100). Plusieurs indicateurs sont en zone d'alerte. Une révision immédiate et des mesures correctives sont recommandées pour prévenir toute dégradation supplémentaire. Les principaux risques incluent : ${concerns}.`,
    summaryImmediate: (score, cfNote) =>
      `CRITIQUE : Le score de risque financier de votre entreprise est de ${score}/100, indiquant une tension financière sévère. Une intervention urgente de la direction est requise. ${cfNote}. Tout retard d'action pourrait entraîner une crise de liquidité.`,
    summaryImmediateLoss: (amt) => `L'entreprise est en déficit de ${amt}`,
    summaryImmediateThin: 'Les marges de trésorerie sont critiquement faibles',
    // Business impact
    impactOk: "Aucun risque financier immédiat ne menace les opérations. L'entreprise est bien positionnée pour des investissements ou des initiatives de croissance planifiés.",
    impactMonitor: (amt, label) =>
      `Sans attention, les tendances actuelles pourraient aggraver le risque dans 2 à 3 mois. La prévision de trésorerie à 30 jours de ${amt} indique ${label}.`,
    impactMonitorStable: 'une liquidité stable mais tendue',
    impactMonitorStrain: 'une contrainte de liquidité potentielle',
    impactAction: (amt60, shortage) =>
      `Sans mesures correctives dans les 30 à 60 prochains jours, l'entreprise risque ${shortage}. La prévision à 60 jours projette ${amt60} de flux net. Des retards de paiements fournisseurs, une réduction de la capacité de crédit et une croissance contrainte sont des conséquences probables.`,
    impactActionShortage: 'd\'entrer en pénurie de trésorerie',
    impactActionCompress: 'une compression supplémentaire des marges',
    impactImmediate: (amt30) =>
      `Sans intervention immédiate, l'entreprise fait face à une forte probabilité de déficit de trésorerie dans les 30 jours (prévision : ${amt30}). Les conséquences potentielles incluent l'incapacité à honorer les salaires, le défaut sur les remboursements de prêts et la perte de conditions de crédit fournisseurs. Les parties prenantes exécutives devraient convoquer une revue financière d'urgence.`,
    // Priority actions
    actionCFCritical: 'Réduire immédiatement les dépenses non essentielles et accélérer le recouvrement des revenus',
    actionCFHigh: 'Réviser et optimiser les catégories de dépenses pour améliorer la marge de trésorerie',
    impactCFCritical: (amt) => `Le déficit de trésorerie actuel de ${amt} menace la continuité opérationnelle`,
    impactCFHigh: (amt) => `La trésorerie de ${amt} laisse un tampon insuffisant pour les dépenses imprévues`,
    actionInvoices: 'Intensifier les efforts de recouvrement sur les factures en retard et appliquer des conditions de paiement plus strictes',
    impactInvoices: (amt) => `${amt} de créances impayées immobilisent le fonds de roulement`,
    actionDebt: 'Restructurer les obligations de dette ou acquérir des actifs productifs pour améliorer le ratio de levier',
    impactDebt: (debt, assets) => `Une dette de ${debt} face à des actifs de ${assets} crée une vulnérabilité aux chocs de marché`,
    actionLoan: 'Renégocier les conditions des prêts ou consolider la dette pour réduire les obligations mensuelles',
    impactLoan: (amt) => `Des mensualités de ${amt} pèsent sur la trésorerie opérationnelle`,
    actionAnomaly: (n) => `Examiner ${n} anomalie(s) de transaction signalée(s) pour détecter d'éventuelles erreurs ou fraudes`,
    impactAnomaly: 'Les schémas de dépenses anormaux peuvent indiquer des transactions non autorisées ou des erreurs de saisie',
    fallback0: 'Maintenir la cadence actuelle de surveillance financière',
    fallback1: 'Réviser les objectifs KPI trimestriels et ajuster les prévisions',
    impactFallback: 'Une surveillance proactive prévient les petits problèmes de devenir critiques',
    // Urgency labels
    urgencyCritical: 'CRITIQUE',
    urgencyHigh: 'ÉLEVÉ',
    urgencyMedium: 'MOYEN',
    urgencyLow: 'FAIBLE',
    // Concerns
    dimensionNames: {
      cashFlow: 'flux de trésorerie',
      invoices: 'risque factures',
      debt: 'risque dette',
      loanBurden: 'charge de prêts',
    },
    concerns: 'plusieurs dimensions de risque',
  },
  en: {
    summaryOk: (score, cf) =>
      `Your company is in good financial health with a risk score of ${score}/100. Cash flow is positive at ${cf}, debt levels are manageable, and invoice collection is on track. Continue current practices and monitor quarterly.`,
    summaryMonitor: (score, cfLabel) =>
      `Your company shows moderate financial risk (${score}/100). While not critical, some indicators require attention. ${cfLabel}, and your financial position could deteriorate if trends continue.`,
    summaryMonitorNegCF: 'Cash flow is negative',
    summaryMonitorThinCF: 'Cash flow margins are thin',
    summaryActionRequired: (score, concerns) =>
      `Your company faces elevated financial risk (${score}/100). Multiple indicators are in warning territory. Immediate review and corrective measures are recommended to prevent further deterioration. Key concerns include ${concerns}.`,
    summaryImmediate: (score, cfNote) =>
      `CRITICAL: Your company's financial risk score is ${score}/100, indicating severe financial stress. Urgent executive-level intervention is required. ${cfNote}. Delay in action could result in liquidity crisis.`,
    summaryImmediateLoss: (amt) => `Operating at a loss of ${amt}`,
    summaryImmediateThin: 'Cash flow margins are critically thin',
    impactOk: 'No immediate financial risks threaten operations. The company is well-positioned for planned investments or growth initiatives.',
    impactMonitor: (amt, label) =>
      `Without attention, current trends could escalate risk within 2-3 months. The 30-day cash flow forecast of ${amt} suggests ${label}.`,
    impactMonitorStable: 'stable but tight liquidity',
    impactMonitorStrain: 'potential liquidity strain',
    impactAction: (amt60, shortage) =>
      `If no corrective measures are taken within the next 30-60 days, the company risks ${shortage}. The 60-day forecast projects ${amt60} in net cash flow. Delayed vendor payments, reduced credit capacity, and constrained growth are likely consequences.`,
    impactActionShortage: 'running into cash shortage',
    impactActionCompress: 'further margin compression',
    impactImmediate: (amt30) =>
      `Without immediate intervention, the company faces high probability of cash shortfall within 30 days (forecast: ${amt30}). Potential consequences include inability to meet payroll, defaulting on loan payments, and loss of vendor credit terms. Executive stakeholders should convene an emergency financial review.`,
    actionCFCritical: 'Immediately cut non-essential spending and accelerate revenue collection',
    actionCFHigh: 'Review and optimize expense categories to improve cash flow margin',
    impactCFCritical: (amt) => `Current negative cash flow of ${amt} threatens operational continuity`,
    impactCFHigh: (amt) => `Cash flow of ${amt} leaves insufficient buffer for unexpected expenses`,
    actionInvoices: 'Escalate collection efforts on overdue invoices and implement stricter payment terms',
    impactInvoices: (amt) => `${amt} in outstanding receivables is tying up working capital`,
    actionDebt: 'Restructure debt obligations or acquire productive assets to improve leverage ratio',
    impactDebt: (debt, assets) => `Debt of ${debt} against assets of ${assets} creates vulnerability to market shocks`,
    actionLoan: 'Renegotiate loan terms or consolidate debt to reduce monthly payment obligations',
    impactLoan: (amt) => `Monthly payments of ${amt} are straining operational cash flow`,
    actionAnomaly: (n) => `Investigate ${n} flagged transaction anomaly(ies) for potential errors or fraud`,
    impactAnomaly: 'Abnormal spending patterns may indicate unauthorized transactions or data entry errors',
    fallback0: 'Maintain current financial monitoring cadence',
    fallback1: 'Review quarterly KPI targets and adjust forecasts',
    impactFallback: 'Proactive monitoring prevents small issues from becoming critical',
    urgencyCritical: 'CRITICAL',
    urgencyHigh: 'HIGH',
    urgencyMedium: 'MEDIUM',
    urgencyLow: 'LOW',
    dimensionNames: {
      cashFlow: 'cash flow',
      invoices: 'invoice risk',
      debt: 'debt risk',
      loanBurden: 'loan burden',
    },
    concerns: 'multiple risk dimensions',
  },
};

function fmt(n) {
  return Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
}

function getTopConcerns(breakdown, t) {
  const names = Object.entries(breakdown)
    .filter(([, v]) => v.score >= 50)
    .map(([k]) => t.dimensionNames[k] || k);
  return names.length > 0 ? names.join(', ') : t.concerns;
}

/**
 * Final Decision Engine — bilingual
 */
async function generateFinalDecision(language = 'fr') {
  const report = await analyzeRisk(language);
  const { globalScore, level, breakdown, metrics, trends, anomalies, forecast } = report;
  const t = TEXT[language] || TEXT.fr;

  // ── Decision tier ────────────────────────────────────
  let decision, decisionColor;
  if (globalScore < 25) {
    decision = 'OK';
    decisionColor = 'green';
  } else if (globalScore < 50) {
    decision = 'Monitor';
    decisionColor = 'yellow';
  } else if (globalScore < 75) {
    decision = 'Action Required';
    decisionColor = 'orange';
  } else {
    decision = 'Immediate Action';
    decisionColor = 'red';
  }

  // ── Summary (bilingual) ──────────────────────────────
  let summary;
  if (decision === 'OK') {
    summary = t.summaryOk(globalScore, fmt(metrics.cashFlow));
  } else if (decision === 'Monitor') {
    const cfLabel = metrics.cashFlow < 0 ? t.summaryMonitorNegCF : t.summaryMonitorThinCF;
    summary = t.summaryMonitor(globalScore, cfLabel);
  } else if (decision === 'Action Required') {
    summary = t.summaryActionRequired(globalScore, getTopConcerns(breakdown, t));
  } else {
    const cfNote = metrics.cashFlow < 0 ? t.summaryImmediateLoss(fmt(metrics.cashFlow)) : t.summaryImmediateThin;
    summary = t.summaryImmediate(globalScore, cfNote);
  }

  // ── Priority Actions (bilingual, top 3) ─────────────
  const actions = [];
  const sorted = Object.entries(breakdown).sort((a, b) => b[1].score - a[1].score);

  sorted.forEach(([dimension, { score }]) => {
    if (actions.length >= 3) return;

    if (dimension === 'cashFlow' && score >= 40) {
      const urgency = score >= 70 ? 'critical' : 'high';
      actions.push({
        priority: actions.length + 1,
        action: score >= 70 ? t.actionCFCritical : t.actionCFHigh,
        impact: score >= 70 ? t.impactCFCritical(fmt(metrics.cashFlow)) : t.impactCFHigh(fmt(metrics.cashFlow)),
        urgency,
        urgencyLabel: score >= 70 ? t.urgencyCritical : t.urgencyHigh,
      });
    } else if (dimension === 'invoices' && score >= 30) {
      actions.push({
        priority: actions.length + 1,
        action: t.actionInvoices,
        impact: t.impactInvoices(fmt(metrics.unpaidInvoices)),
        urgency: score >= 60 ? 'high' : 'medium',
        urgencyLabel: score >= 60 ? t.urgencyHigh : t.urgencyMedium,
      });
    } else if (dimension === 'debt' && score >= 30) {
      actions.push({
        priority: actions.length + 1,
        action: t.actionDebt,
        impact: t.impactDebt(fmt(metrics.totalDebt), fmt(metrics.totalAssetValue)),
        urgency: score >= 60 ? 'high' : 'medium',
        urgencyLabel: score >= 60 ? t.urgencyHigh : t.urgencyMedium,
      });
    } else if (dimension === 'loanBurden' && score >= 30) {
      actions.push({
        priority: actions.length + 1,
        action: t.actionLoan,
        impact: t.impactLoan(fmt(metrics.monthlyLoanPayments)),
        urgency: score >= 60 ? 'high' : 'medium',
        urgencyLabel: score >= 60 ? t.urgencyHigh : t.urgencyMedium,
      });
    }
  });

  if (anomalies.length > 0 && actions.length < 3) {
    actions.push({
      priority: actions.length + 1,
      action: t.actionAnomaly(anomalies.length),
      impact: t.impactAnomaly,
      urgency: 'medium',
      urgencyLabel: t.urgencyMedium,
    });
  }

  while (actions.length < 3) {
    actions.push({
      priority: actions.length + 1,
      action: actions.length === 0 ? t.fallback0 : t.fallback1,
      impact: t.impactFallback,
      urgency: 'low',
      urgencyLabel: t.urgencyLow,
    });
  }

  // ── Business Impact (bilingual) ──────────────────────
  let businessImpact;
  if (decision === 'OK') {
    businessImpact = t.impactOk;
  } else if (decision === 'Monitor') {
    const label = forecast.forecast30Days >= 0 ? t.impactMonitorStable : t.impactMonitorStrain;
    businessImpact = t.impactMonitor(fmt(forecast.forecast30Days), label);
  } else if (decision === 'Action Required') {
    const shortage = forecast.forecast60Days < 0 ? t.impactActionShortage : t.impactActionCompress;
    businessImpact = t.impactAction(fmt(forecast.forecast60Days), shortage);
  } else {
    businessImpact = t.impactImmediate(fmt(forecast.forecast30Days));
  }

  return {
    decision,
    decisionColor,
    summary,
    priorityActions: actions,
    businessImpact,
    riskReport: report,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generateFinalDecision };
