const { analyzeRisk } = require('./aiService');

/**
 * Final Decision Engine
 * Transforms AI risk analysis into actionable business decisions.
 */
async function generateFinalDecision() {
  const report = await analyzeRisk();
  const { globalScore, level, breakdown, metrics, trends, anomalies, forecast } = report;

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

  // ── Summary ──────────────────────────────────────────
  const fmt = (n) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
  let summary;
  if (decision === 'OK') {
    summary = `Your company is in good financial health with a risk score of ${globalScore}/100. Cash flow is positive at ${fmt(metrics.cashFlow)}, debt levels are manageable, and invoice collection is on track. Continue current practices and monitor quarterly.`;
  } else if (decision === 'Monitor') {
    summary = `Your company shows moderate financial risk (${globalScore}/100). While not critical, some indicators require attention. ${metrics.cashFlow < 0 ? 'Cash flow is negative' : 'Cash flow margins are thin'}, and your financial position could deteriorate if trends continue.`;
  } else if (decision === 'Action Required') {
    summary = `Your company faces elevated financial risk (${globalScore}/100). Multiple indicators are in warning territory. Immediate review and corrective measures are recommended to prevent further deterioration. Key concerns include ${_getTopConcerns(breakdown)}.`;
  } else {
    summary = `CRITICAL: Your company's financial risk score is ${globalScore}/100, indicating severe financial stress. Urgent executive-level intervention is required. ${metrics.cashFlow < 0 ? `Operating at a loss of ${fmt(metrics.cashFlow)}` : 'Cash flow margins are critically thin'}. Delay in action could result in liquidity crisis.`;
  }

  // ── Priority Actions (top 3) ─────────────────────────
  const actions = [];

  // Sort risk dimensions by score descending
  const sorted = Object.entries(breakdown).sort((a, b) => b[1].score - a[1].score);

  sorted.forEach(([dimension, { score }]) => {
    if (actions.length >= 3) return;

    if (dimension === 'cashFlow' && score >= 40) {
      actions.push({
        priority: actions.length + 1,
        action: score >= 70 ? 'Immediately cut non-essential spending and accelerate revenue collection' : 'Review and optimize expense categories to improve cash flow margin',
        impact: score >= 70 ? `Current negative cash flow of ${fmt(metrics.cashFlow)} threatens operational continuity` : `Cash flow of ${fmt(metrics.cashFlow)} leaves insufficient buffer for unexpected expenses`,
        urgency: score >= 70 ? 'critical' : 'high',
      });
    } else if (dimension === 'invoices' && score >= 30) {
      actions.push({
        priority: actions.length + 1,
        action: 'Escalate collection efforts on overdue invoices and implement stricter payment terms',
        impact: `${fmt(metrics.unpaidInvoices)} in outstanding receivables is tying up working capital`,
        urgency: score >= 60 ? 'high' : 'medium',
      });
    } else if (dimension === 'debt' && score >= 30) {
      actions.push({
        priority: actions.length + 1,
        action: 'Restructure debt obligations or acquire productive assets to improve leverage ratio',
        impact: `Debt of ${fmt(metrics.totalDebt)} against assets of ${fmt(metrics.totalAssetValue)} creates vulnerability to market shocks`,
        urgency: score >= 60 ? 'high' : 'medium',
      });
    } else if (dimension === 'loanBurden' && score >= 30) {
      actions.push({
        priority: actions.length + 1,
        action: 'Renegotiate loan terms or consolidate debt to reduce monthly payment obligations',
        impact: `Monthly payments of ${fmt(metrics.monthlyLoanPayments)} are straining operational cash flow`,
        urgency: score >= 60 ? 'high' : 'medium',
      });
    }
  });

  // Add anomaly action if detected
  if (anomalies.length > 0 && actions.length < 3) {
    actions.push({
      priority: actions.length + 1,
      action: `Investigate ${anomalies.length} flagged transaction anomaly(ies) for potential errors or fraud`,
      impact: 'Abnormal spending patterns may indicate unauthorized transactions or data entry errors',
      urgency: 'medium',
    });
  }

  // Fallback
  while (actions.length < 3) {
    actions.push({
      priority: actions.length + 1,
      action: actions.length === 0 ? 'Maintain current financial monitoring cadence' : 'Review quarterly KPI targets and adjust forecasts',
      impact: 'Proactive monitoring prevents small issues from becoming critical',
      urgency: 'low',
    });
  }

  // ── Business Impact ──────────────────────────────────
  let businessImpact;
  if (decision === 'OK') {
    businessImpact = 'No immediate financial risks threaten operations. The company is well-positioned for planned investments or growth initiatives.';
  } else if (decision === 'Monitor') {
    businessImpact = `Without attention, current trends could escalate risk within 2-3 months. The 30-day cash flow forecast of ${fmt(forecast.forecast30Days)} suggests ${forecast.forecast30Days >= 0 ? 'stable but tight liquidity' : 'potential liquidity strain'}.`;
  } else if (decision === 'Action Required') {
    businessImpact = `If no corrective measures are taken within the next 30-60 days, the company risks ${forecast.forecast60Days < 0 ? 'running into cash shortage' : 'further margin compression'}. The 60-day forecast projects ${fmt(forecast.forecast60Days)} in net cash flow. Delayed vendor payments, reduced credit capacity, and constrained growth are likely consequences.`;
  } else {
    businessImpact = `Without immediate intervention, the company faces high probability of cash shortfall within 30 days (forecast: ${fmt(forecast.forecast30Days)}). Potential consequences include inability to meet payroll, defaulting on loan payments, and loss of vendor credit terms. Executive stakeholders should convene an emergency financial review.`;
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

function _getTopConcerns(breakdown) {
  return Object.entries(breakdown)
    .filter(([, v]) => v.score >= 50)
    .map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase().trim())
    .join(', ') || 'multiple risk dimensions';
}

module.exports = { generateFinalDecision };
