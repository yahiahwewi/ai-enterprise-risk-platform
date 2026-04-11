/**
 * AI Copilot — smart query router that answers business questions
 * using existing AI services. Not an LLM — a structured query engine.
 */

const { analyzeRisk } = require('./aiService');
const { calculateHealthIndex } = require('./healthIndex');
const { getInvoiceRiskScores } = require('./forecastService');

const patterns = {
  risk: /risk|risque|score|danger|level|niveau/i,
  cashflow: /cash|trésorerie|flux|liquidity|liquidité/i,
  invoice: /invoice|facture|client|impayé|overdue|retard|late/i,
  why: /why|pourquoi|cause|raison|explain|expliquer/i,
  recommend: /recommend|recommand|conseil|action|améliorer|improve/i,
  forecast: /forecast|prévision|predict|futur|avenir|projection/i,
  health: /health|santé|index|grade|note/i,
  expense: /expense|dépense|coût|cost|spending/i,
};

async function answerQuestion(question) {
  const q = question.toLowerCase();
  const matched = [];

  for (const [key, regex] of Object.entries(patterns)) {
    if (regex.test(q)) matched.push(key);
  }

  if (matched.length === 0) matched.push('risk'); // Default to risk overview

  const report = await analyzeRisk();
  const sources = [];
  let answer = '';
  const suggestions = [];

  // Build answer based on matched intents
  if (matched.includes('health')) {
    const health = await calculateHealthIndex();
    answer += `Indice de santé financière: ${health.score}/100 (Grade ${health.grade}). `;
    answer += `Liquidité: ${health.dimensions.liquidity.score}/100, Stabilité: ${health.dimensions.stability.score}/100, Croissance: ${health.dimensions.growth.score}/100, Efficacité: ${health.dimensions.efficiency.score}/100. `;
    sources.push('healthIndex');
  }

  if (matched.includes('risk') || matched.includes('why')) {
    answer += `Score de risque global: ${report.globalScore}/100 (${report.level}). `;
    answer += `Confiance IA: ${report.confidence}%. `;

    if (matched.includes('why')) {
      answer += 'Principales causes: ';
      answer += report.explanations.join(' ');
    }
    sources.push('aiService');
  }

  if (matched.includes('cashflow') || matched.includes('forecast')) {
    answer += `Flux de trésorerie: ${report.metrics.cashFlow.toLocaleString()} TND. `;
    answer += `Prévision 30j: ${report.forecast.forecast30Days.toLocaleString()} TND. `;
    answer += `Prévision 60j: ${report.forecast.forecast60Days.toLocaleString()} TND. `;
    sources.push('forecast');
  }

  if (matched.includes('invoice')) {
    const invoiceRisks = await getInvoiceRiskScores();
    const highRisk = invoiceRisks.filter(ir => ir.riskScore >= 50);
    answer += `Factures impayées: ${report.metrics.unpaidInvoices.toLocaleString()} TND. `;
    answer += `Factures en retard: ${report.metrics.lateInvoices.toLocaleString()} TND. `;
    if (highRisk.length > 0) {
      answer += `Clients à risque: ${highRisk.map(ir => `${ir.clientName} (${ir.riskScore}/100)`).join(', ')}. `;
    }
    sources.push('invoiceRisk');
  }

  if (matched.includes('expense')) {
    answer += `Dépenses totales: ${report.metrics.totalExpenses.toLocaleString()} TND. `;
    answer += `Revenus totaux: ${report.metrics.totalIncome.toLocaleString()} TND. `;
    const ratio = report.metrics.totalIncome > 0 ? Math.round((report.metrics.totalExpenses / report.metrics.totalIncome) * 100) : 100;
    answer += `Ratio dépenses/revenus: ${ratio}%. `;
    if (report.trends.expenses.change > 10) {
      answer += `Les dépenses ont augmenté de ${report.trends.expenses.change}% par rapport à la période précédente. `;
    }
    sources.push('trends');
  }

  if (matched.includes('recommend')) {
    answer += 'Recommandations: ';
    answer += report.recommendations.join(' ');
    sources.push('recommendations');
    suggestions.push(...report.recommendations.slice(0, 3));
  }

  // Add follow-up suggestions
  if (!matched.includes('recommend')) suggestions.push('Quelles sont les recommandations ?');
  if (!matched.includes('why')) suggestions.push('Pourquoi le risque est-il à ce niveau ?');
  if (!matched.includes('forecast')) suggestions.push('Quelle est la prévision de trésorerie ?');

  return {
    answer: answer.trim(),
    sources,
    suggestions: suggestions.slice(0, 3),
    confidence: report.confidence,
  };
}

module.exports = { answerQuestion };
