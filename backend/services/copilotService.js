/**
 * AI Copilot — smart query router. Fully bilingual (FR/EN).
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

const labels = {
  fr: {
    riskScore: 'Score de risque global',
    confidence: 'Confiance IA',
    healthScore: 'Indice de santé financière',
    grade: 'Grade',
    liquidity: 'Liquidité',
    stability: 'Stabilité',
    growth: 'Croissance',
    efficiency: 'Efficacité',
    cashFlow: 'Flux de trésorerie',
    forecast30: 'Prévision 30 jours',
    forecast60: 'Prévision 60 jours',
    unpaidInvoices: 'Factures impayées',
    lateInvoices: 'Factures en retard',
    riskyClients: 'Clients à risque',
    totalExpenses: 'Dépenses totales',
    totalIncome: 'Revenus totaux',
    expenseRatio: 'Ratio dépenses/revenus',
    expenseIncrease: 'Les dépenses ont augmenté de',
    vsPrev: 'par rapport à la période précédente',
    mainCauses: 'Principales causes',
    recommendations: 'Recommandations',
    suggestReco: 'Quelles sont les recommandations ?',
    suggestWhy: 'Pourquoi le risque est-il à ce niveau ?',
    suggestForecast: 'Quelle est la prévision de trésorerie ?',
    suggestHealth: 'Quel est l\'indice de santé financière ?',
  },
  en: {
    riskScore: 'Global risk score',
    confidence: 'AI Confidence',
    healthScore: 'Financial health index',
    grade: 'Grade',
    liquidity: 'Liquidity',
    stability: 'Stability',
    growth: 'Growth',
    efficiency: 'Efficiency',
    cashFlow: 'Cash flow',
    forecast30: '30-day forecast',
    forecast60: '60-day forecast',
    unpaidInvoices: 'Unpaid invoices',
    lateInvoices: 'Late invoices',
    riskyClients: 'Risky clients',
    totalExpenses: 'Total expenses',
    totalIncome: 'Total income',
    expenseRatio: 'Expense-to-income ratio',
    expenseIncrease: 'Expenses increased by',
    vsPrev: 'compared to previous period',
    mainCauses: 'Main causes',
    recommendations: 'Recommendations',
    suggestReco: 'What are the recommendations?',
    suggestWhy: 'Why is risk at this level?',
    suggestForecast: 'What is the cash flow forecast?',
    suggestHealth: 'What is the financial health index?',
  },
};

async function answerQuestion(question, language = 'fr') {
  const l = labels[language] || labels.fr;
  const q = question.toLowerCase();
  const matched = [];

  for (const [key, regex] of Object.entries(patterns)) {
    if (regex.test(q)) matched.push(key);
  }
  if (matched.length === 0) matched.push('risk');

  const report = await analyzeRisk();
  const sources = [];
  let answer = '';
  const suggestions = [];

  if (matched.includes('health')) {
    const health = await calculateHealthIndex();
    answer += `${l.healthScore}: ${health.score}/100 (${l.grade} ${health.grade}). `;
    answer += `${l.liquidity}: ${health.dimensions.liquidity.score}/100, ${l.stability}: ${health.dimensions.stability.score}/100, ${l.growth}: ${health.dimensions.growth.score}/100, ${l.efficiency}: ${health.dimensions.efficiency.score}/100. `;
    sources.push('healthIndex');
  }

  if (matched.includes('risk') || matched.includes('why')) {
    answer += `${l.riskScore}: ${report.globalScore}/100 (${report.level}). `;
    answer += `${l.confidence}: ${report.confidence}%. `;
    if (matched.includes('why') && report.rootCauses) {
      answer += `${l.mainCauses}: `;
      answer += report.rootCauses.map(rc => `${rc.cause} (+${rc.contribution} pts)`).join('; ') + '. ';
    }
    sources.push('aiService');
  }

  if (matched.includes('cashflow') || matched.includes('forecast')) {
    answer += `${l.cashFlow}: ${report.metrics.cashFlow.toLocaleString()} TND. `;
    answer += `${l.forecast30}: ${report.forecast.forecast30Days.toLocaleString()} TND. `;
    answer += `${l.forecast60}: ${report.forecast.forecast60Days.toLocaleString()} TND. `;
    sources.push('forecast');
  }

  if (matched.includes('invoice')) {
    const invoiceRisks = await getInvoiceRiskScores();
    const highRisk = invoiceRisks.filter(ir => ir.riskScore >= 50);
    answer += `${l.unpaidInvoices}: ${report.metrics.unpaidInvoices.toLocaleString()} TND. `;
    answer += `${l.lateInvoices}: ${report.metrics.lateInvoices.toLocaleString()} TND. `;
    if (highRisk.length > 0) {
      answer += `${l.riskyClients}: ${highRisk.map(ir => `${ir.clientName} (${ir.riskScore}/100)`).join(', ')}. `;
    }
    sources.push('invoiceRisk');
  }

  if (matched.includes('expense')) {
    answer += `${l.totalExpenses}: ${report.metrics.totalExpenses.toLocaleString()} TND. `;
    answer += `${l.totalIncome}: ${report.metrics.totalIncome.toLocaleString()} TND. `;
    const ratio = report.metrics.totalIncome > 0 ? Math.round((report.metrics.totalExpenses / report.metrics.totalIncome) * 100) : 100;
    answer += `${l.expenseRatio}: ${ratio}%. `;
    if (report.trends.expenses.change > 10) {
      answer += `${l.expenseIncrease} ${report.trends.expenses.change}% ${l.vsPrev}. `;
    }
    sources.push('trends');
  }

  if (matched.includes('recommend')) {
    answer += `${l.recommendations}: `;
    answer += report.recommendations.join(' ');
    sources.push('recommendations');
  }

  // Follow-up suggestions in the user's language
  if (!matched.includes('recommend')) suggestions.push(l.suggestReco);
  if (!matched.includes('why')) suggestions.push(l.suggestWhy);
  if (!matched.includes('forecast')) suggestions.push(l.suggestForecast);
  if (!matched.includes('health')) suggestions.push(l.suggestHealth);

  return {
    answer: answer.trim(),
    sources,
    suggestions: suggestions.slice(0, 3),
    confidence: report.confidence,
  };
}

module.exports = { answerQuestion };
