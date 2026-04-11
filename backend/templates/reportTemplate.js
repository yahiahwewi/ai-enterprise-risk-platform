/**
 * Executive PDF Report Template
 *
 * Generates a full HTML document that Puppeteer renders to PDF.
 * Design: Corporate consulting-grade (Deloitte / SAP style)
 */

const path = require('path');
const fs = require('fs');

// Load logo as base64 for embedding in PDF
function getLogoBase64() {
  try {
    const logoPath = path.resolve(__dirname, '../../frontend/public/logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    return '';
  }
}

// Labels for both languages
const labels = {
  fr: {
    title: 'Rapport Exécutif de Risque IA',
    subtitle: 'Analyse de Risque d\'Entreprise',
    confidential: 'CONFIDENTIEL',
    generatedOn: 'Généré le',
    preparedFor: 'Préparé pour',
    executiveSummary: 'Résumé Exécutif',
    aiDecision: 'Décision IA',
    businessImpact: 'Impact Business',
    kpiOverview: 'Indicateurs Clés de Performance',
    cashFlow: 'Flux de Trésorerie',
    totalIncome: 'Revenus Totaux',
    totalExpenses: 'Dépenses Totales',
    netCashFlow: 'Flux Net',
    debtRatio: 'Ratio d\'Endettement',
    totalDebt: 'Dette Totale',
    totalAssets: 'Actifs Totaux',
    ratio: 'Ratio',
    invoiceRisk: 'Risque Factures',
    collectionRate: 'Taux de Recouvrement',
    paid: 'Payées',
    pending: 'En attente',
    late: 'En retard',
    growthIndicator: 'Indicateur de Croissance',
    income30d: 'Revenus 30j',
    expenses30d: 'Dépenses 30j',
    trend: 'Tendance',
    aiInsights: 'Analyses & Alertes IA',
    anomaliesDetected: 'Anomalies Détectées',
    category: 'Catégorie',
    amount: 'Montant',
    expected: 'Attendu',
    deviation: 'Déviation',
    trendAnalysis: 'Analyse de Tendance (30j vs 30j préc.)',
    metric: 'Indicateur',
    current: 'Actuel',
    previous: 'Précédent',
    change: 'Variation',
    riskDrivers: 'Facteurs de Risque',
    forecastSection: 'Prévisions & Projections',
    cashFlowForecast: 'Prévision de Trésorerie',
    forecast30d: 'Prévision 30 jours',
    forecast60d: 'Prévision 60 jours',
    projectedIncome: 'Revenus projetés',
    projectedExpenses: 'Dépenses projetées',
    pendingInflow: 'Encaissements en attente',
    loanPayments: 'Échéances de prêts',
    invoiceDelayRisk: 'Risque de Retard Factures',
    client: 'Client',
    dueDate: 'Échéance',
    riskScore: 'Score de Risque',
    factors: 'Facteurs',
    loanStressTest: 'Simulation de Stress Prêts (+2%)',
    currentPayment: 'Paiement Actuel',
    stressedPayment: 'Paiement Stressé',
    increase: 'Augmentation',
    recommendations: 'Recommandations & Actions',
    priorityActions: 'Actions Prioritaires',
    priority: 'Priorité',
    action: 'Action',
    impact: 'Impact',
    urgency: 'Urgence',
    additionalReco: 'Recommandations Additionnelles',
    appendix: 'Annexe Technique',
    aiConfidence: 'Score de Confiance IA',
    confidenceExplain: 'Le score de confiance est calculé à partir du volume de données (40%), de la récence des transactions (30%) et de la cohérence des données mensuelles (30%).',
    modelLogic: 'Logique du Modèle',
    modelExplain: 'Le moteur d\'IA utilise un scoring pondéré sur 4 dimensions : Flux de trésorerie (35%), Risque factures (25%), Risque dette (25%) et Charge de prêts (15%). Chaque dimension est évaluée sur une échelle 0-100 et agrégée en un score global.',
    dataSources: 'Sources de Données',
    riskCalcSummary: 'Résumé du Calcul de Risque',
    weight: 'Poids',
    score: 'Score',
    dimension: 'Dimension',
    page: 'Page',
    of: 'de',
    noAnomalies: 'Aucune anomalie détectée. Les transactions sont dans les limites normales.',
    lowRisk: 'Risque Faible',
    moderateRisk: 'Risque Modéré',
    highRisk: 'Risque Élevé',
    criticalRisk: 'Risque Critique',
    ok: 'OK — Situation Favorable',
    monitor: 'SURVEILLER — Attention Requise',
    actionRequired: 'ACTION REQUISE — Intervention Nécessaire',
    immediateAction: 'ACTION IMMÉDIATE — Urgence Critique',
    topExpenses: 'Principales Dépenses',
  },
  en: {
    title: 'Executive AI Risk Report',
    subtitle: 'Enterprise Risk Analysis',
    confidential: 'CONFIDENTIAL',
    generatedOn: 'Generated on',
    preparedFor: 'Prepared for',
    executiveSummary: 'Executive Summary',
    aiDecision: 'AI Decision',
    businessImpact: 'Business Impact',
    kpiOverview: 'Key Performance Indicators',
    cashFlow: 'Cash Flow',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netCashFlow: 'Net Cash Flow',
    debtRatio: 'Debt Ratio',
    totalDebt: 'Total Debt',
    totalAssets: 'Total Assets',
    ratio: 'Ratio',
    invoiceRisk: 'Invoice Risk',
    collectionRate: 'Collection Rate',
    paid: 'Paid',
    pending: 'Pending',
    late: 'Late',
    growthIndicator: 'Growth Indicator',
    income30d: 'Income 30d',
    expenses30d: 'Expenses 30d',
    trend: 'Trend',
    aiInsights: 'AI Insights & Alerts',
    anomaliesDetected: 'Detected Anomalies',
    category: 'Category',
    amount: 'Amount',
    expected: 'Expected',
    deviation: 'Deviation',
    trendAnalysis: 'Trend Analysis (30d vs prev 30d)',
    metric: 'Metric',
    current: 'Current',
    previous: 'Previous',
    change: 'Change',
    riskDrivers: 'Risk Drivers',
    forecastSection: 'Forecasts & Projections',
    cashFlowForecast: 'Cash Flow Forecast',
    forecast30d: '30-Day Forecast',
    forecast60d: '60-Day Forecast',
    projectedIncome: 'Projected Income',
    projectedExpenses: 'Projected Expenses',
    pendingInflow: 'Pending Inflow',
    loanPayments: 'Loan Payments',
    invoiceDelayRisk: 'Invoice Delay Risk',
    client: 'Client',
    dueDate: 'Due Date',
    riskScore: 'Risk Score',
    factors: 'Factors',
    loanStressTest: 'Loan Stress Test (+2%)',
    currentPayment: 'Current Payment',
    stressedPayment: 'Stressed Payment',
    increase: 'Increase',
    recommendations: 'Recommendations & Actions',
    priorityActions: 'Priority Actions',
    priority: 'Priority',
    action: 'Action',
    impact: 'Impact',
    urgency: 'Urgency',
    additionalReco: 'Additional Recommendations',
    appendix: 'Technical Appendix',
    aiConfidence: 'AI Confidence Score',
    confidenceExplain: 'The confidence score is calculated from data volume (40%), transaction recency (30%), and monthly data consistency (30%).',
    modelLogic: 'Model Logic',
    modelExplain: 'The AI engine uses weighted scoring across 4 dimensions: Cash Flow (35%), Invoice Risk (25%), Debt Risk (25%), and Loan Burden (15%). Each dimension is scored 0-100 and aggregated into a global score.',
    dataSources: 'Data Sources',
    riskCalcSummary: 'Risk Calculation Summary',
    weight: 'Weight',
    score: 'Score',
    dimension: 'Dimension',
    page: 'Page',
    of: 'of',
    noAnomalies: 'No anomalies detected. All transactions are within normal ranges.',
    lowRisk: 'Low Risk',
    moderateRisk: 'Moderate Risk',
    highRisk: 'High Risk',
    criticalRisk: 'Critical Risk',
    ok: 'OK — Favorable Situation',
    monitor: 'MONITOR — Attention Required',
    actionRequired: 'ACTION REQUIRED — Intervention Needed',
    immediateAction: 'IMMEDIATE ACTION — Critical Urgency',
    topExpenses: 'Top Expenses',
  },
};

function fmt(n) {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
}

function pct(n) {
  return (n > 0 ? '+' : '') + n + '%';
}

function riskBadgeColor(level) {
  if (level === 'critical') return '#ba1a1a';
  if (level === 'high') return '#e67e22';
  if (level === 'moderate') return '#d97706';
  return '#0d9e6e';
}

function decisionBadge(decision, color, l) {
  const bgMap = { green: '#e8f5e9', yellow: '#fff8e1', orange: '#fff3e0', red: '#ffebee' };
  const textMap = { green: '#2e7d32', yellow: '#f57f17', orange: '#e65100', red: '#c62828' };
  return `<div style="display:inline-block;padding:8px 24px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1px;text-transform:uppercase;background:${bgMap[color]||bgMap.yellow};color:${textMap[color]||textMap.yellow};border:2px solid ${textMap[color]||textMap.yellow}40">${decision}</div>`;
}

function progressBar(value, max = 100, color = '#00355f') {
  const pctVal = Math.min((value / max) * 100, 100);
  return `<div style="background:#e8ecf1;border-radius:4px;height:8px;overflow:hidden;margin-top:4px"><div style="width:${pctVal}%;height:100%;background:${color};border-radius:4px"></div></div>`;
}

function generateReportHTML(data) {
  const l = labels[data.language] || labels.fr;
  const logo = getLogoBase64();
  const riskColor = riskBadgeColor(data.risk.level);
  const riskLabel = l[data.risk.level + 'Risk'] || data.risk.level;
  const dateStr = new Date(data.generatedAt).toLocaleDateString(data.language === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="${data.language}">
<head>
<meta charset="utf-8">
<style>
  @page { margin: 0; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #191c1e; font-size: 10px; line-height: 1.5; }

  .page { width: 210mm; min-height: 297mm; padding: 20mm 22mm; page-break-after: always; position: relative; background: #fff; }
  .page:last-child { page-break-after: auto; }

  /* Watermark */
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 72px; font-weight: 800; color: rgba(0,53,95,0.03); letter-spacing: 12px; pointer-events: none; z-index: 0; text-transform: uppercase; }

  /* Header bar on each page */
  .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #00355f; margin-bottom: 20px; }
  .page-header img { height: 22px; }
  .page-header .page-title { font-size: 8px; color: #57657a; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }

  /* Footer */
  .page-footer { position: absolute; bottom: 12mm; left: 22mm; right: 22mm; display: flex; justify-content: space-between; font-size: 7px; color: #8d99ae; border-top: 1px solid #e8ecf1; padding-top: 6px; }

  /* Cover page */
  .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 297mm; background: linear-gradient(180deg, #ffffff 0%, #f7f9fb 100%); }
  .cover .accent-bar { width: 100%; height: 6px; background: linear-gradient(90deg, #00355f, #0f4c81); margin-bottom: 60px; position: absolute; top: 0; left: 0; }
  .cover img { height: 42px; margin-bottom: 32px; }
  .cover h1 { font-size: 28px; font-weight: 800; color: #00355f; letter-spacing: -0.5px; margin-bottom: 6px; }
  .cover .cover-subtitle { font-size: 13px; color: #57657a; font-weight: 500; margin-bottom: 40px; }
  .cover .cover-company { font-size: 16px; font-weight: 700; color: #191c1e; margin-bottom: 4px; }
  .cover .cover-date { font-size: 11px; color: #57657a; margin-bottom: 40px; }
  .cover .score-ring { width: 140px; height: 140px; position: relative; margin: 0 auto 16px; }
  .cover .score-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .cover .score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 36px; font-weight: 800; color: #191c1e; }
  .cover .score-label { font-size: 11px; font-weight: 700; padding: 4px 16px; border-radius: 20px; display: inline-block; }
  .cover .confidential { font-size: 8px; color: #8d99ae; letter-spacing: 3px; text-transform: uppercase; font-weight: 700; margin-top: 40px; }

  /* Section headings */
  .section-title { font-size: 16px; font-weight: 800; color: #00355f; margin-bottom: 4px; letter-spacing: -0.3px; }
  .section-subtitle { font-size: 9px; color: #57657a; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 16px; }
  .section-divider { width: 40px; height: 3px; background: #00355f; border-radius: 2px; margin-bottom: 16px; }

  /* Cards */
  .card { background: #f7f9fb; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .card-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .card-label { font-size: 8px; color: #57657a; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; }
  .card-value { font-size: 20px; font-weight: 800; color: #191c1e; }
  .card-value-sm { font-size: 14px; font-weight: 700; color: #191c1e; }
  .card-trend { font-size: 9px; font-weight: 700; margin-top: 2px; }
  .trend-up { color: #ba1a1a; }
  .trend-down { color: #0d9e6e; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 16px; }
  th { background: #f0f2f4; color: #57657a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; font-size: 7.5px; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e8ecf1; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8ecf1; color: #191c1e; }
  tr:last-child td { border-bottom: none; }

  /* Decision box */
  .decision-box { background: #f7f9fb; border-left: 4px solid; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 16px; }

  /* Priority cards */
  .priority-item { display: flex; gap: 12px; padding: 10px 14px; background: #f7f9fb; border-radius: 8px; margin-bottom: 8px; align-items: flex-start; }
  .priority-num { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0; }
  .priority-content h4 { font-size: 10px; font-weight: 700; margin-bottom: 2px; }
  .priority-content p { font-size: 8.5px; color: #57657a; }

  /* Alert items */
  .alert-item { padding: 10px 14px; border-left: 3px solid; border-radius: 0 8px 8px 0; margin-bottom: 8px; font-size: 9px; line-height: 1.6; }
  .alert-success { background: #e8f5e9; border-color: #0d9e6e; color: #1b5e20; }
  .alert-warning { background: #fff8e1; border-color: #d97706; color: #e65100; }
  .alert-danger { background: #ffebee; border-color: #ba1a1a; color: #b71c1c; }
  .alert-info { background: #e3f2fd; border-color: #0f4c81; color: #0d47a1; }

  /* Badge */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 7.5px; font-weight: 700; }

  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .mb-8 { margin-bottom: 8px; }
  .mb-16 { margin-bottom: 16px; }
  .mt-8 { margin-top: 8px; }
</style>
</head>
<body>
<div class="watermark">${l.confidential}</div>

<!-- ═══════════════════ PAGE 1: COVER ═══════════════════ -->
<div class="page cover">
  <div class="accent-bar"></div>
  ${logo ? `<img src="${logo}" alt="Tac-Tic">` : ''}
  <h1>${l.title}</h1>
  <div class="cover-subtitle">${l.subtitle}</div>
  <div class="cover-company">${data.company.name}</div>
  <div class="cover-date">${l.preparedFor} ${data.company.owner} — ${data.period}</div>

  <div class="score-ring">
    <svg viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="60" fill="transparent" stroke="#e8ecf1" stroke-width="8"/>
      <circle cx="70" cy="70" r="60" fill="transparent" stroke="${riskColor}" stroke-width="8"
        stroke-dasharray="${2 * Math.PI * 60}" stroke-dashoffset="${2 * Math.PI * 60 * (1 - data.risk.globalScore / 100)}"
        stroke-linecap="round"/>
    </svg>
    <div class="score-value">${data.risk.globalScore}</div>
  </div>
  <div class="score-label" style="background:${riskColor}15;color:${riskColor}">${riskLabel}</div>

  <div class="confidential">${l.confidential} — ${l.generatedOn} ${dateStr}</div>
  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 1</span>
  </div>
</div>

<!-- ═══════════════════ PAGE 2: EXECUTIVE SUMMARY ═══════════════════ -->
<div class="page">
  <div class="page-header">
    ${logo ? `<img src="${logo}">` : ''}
    <span class="page-title">${l.executiveSummary}</span>
  </div>

  <div class="section-title">${l.executiveSummary}</div>
  <div class="section-divider"></div>

  <!-- Decision -->
  <div class="mb-16">
    <div class="card-label">${l.aiDecision}</div>
    ${decisionBadge(data.decision.decision, data.decision.decisionColor, l)}
    <div style="margin-top:8px;font-size:8px;color:#57657a">${l.aiConfidence}: ${data.risk.confidence}%</div>
  </div>

  <div class="decision-box" style="border-color:${riskColor}">
    <div style="font-size:10px;line-height:1.7;color:#191c1e">${data.decision.summary}</div>
  </div>

  <div class="decision-box" style="border-color:#d97706;background:#fff8e1">
    <div class="card-label">${l.businessImpact}</div>
    <div style="font-size:9px;line-height:1.7;color:#5d4037">${data.decision.businessImpact}</div>
  </div>

  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 2</span>
  </div>
</div>

<!-- ═══════════════════ PAGE 3: KPI OVERVIEW ═══════════════════ -->
<div class="page">
  <div class="page-header">
    ${logo ? `<img src="${logo}">` : ''}
    <span class="page-title">${l.kpiOverview}</span>
  </div>

  <div class="section-title">${l.kpiOverview}</div>
  <div class="section-divider"></div>

  <div class="card-grid">
    <!-- Cash Flow -->
    <div class="card">
      <div class="card-label">${l.cashFlow}</div>
      <div class="card-value" style="color:${data.kpis.cashFlow >= 0 ? '#0d9e6e' : '#ba1a1a'}">${fmt(data.kpis.cashFlow)}</div>
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="card-label">${l.totalIncome}</div><div class="card-value-sm" style="color:#0d9e6e">${fmt(data.kpis.totalIncome)}</div></div>
        <div><div class="card-label">${l.totalExpenses}</div><div class="card-value-sm" style="color:#ba1a1a">${fmt(data.kpis.totalExpenses)}</div></div>
      </div>
      ${progressBar(Math.min(data.kpis.totalIncome, data.kpis.totalExpenses * 2) > 0 ? (data.kpis.totalIncome / (data.kpis.totalIncome + data.kpis.totalExpenses)) * 100 : 50, 100, data.kpis.cashFlow >= 0 ? '#0d9e6e' : '#ba1a1a')}
    </div>

    <!-- Debt Ratio -->
    <div class="card">
      <div class="card-label">${l.debtRatio}</div>
      <div class="card-value">${data.kpis.debtToAssetRatio}x</div>
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="card-label">${l.totalDebt}</div><div class="card-value-sm">${fmt(data.kpis.totalDebt)}</div></div>
        <div><div class="card-label">${l.totalAssets}</div><div class="card-value-sm">${fmt(data.kpis.totalAssetValue)}</div></div>
      </div>
      ${progressBar(parseFloat(data.kpis.debtToAssetRatio) * 50 || 0, 100, parseFloat(data.kpis.debtToAssetRatio) > 1 ? '#ba1a1a' : '#0d9e6e')}
    </div>

    <!-- Invoice Risk -->
    <div class="card">
      <div class="card-label">${l.invoiceRisk}</div>
      <div class="card-value">${data.kpis.collectionRate}%</div>
      <div class="card-label mt-8">${l.collectionRate}</div>
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center">
        <div><div class="badge" style="background:#e8f5e9;color:#2e7d32">${data.kpis.invoicesPaid} ${l.paid}</div></div>
        <div><div class="badge" style="background:#fff8e1;color:#f57f17">${data.kpis.invoicesPending} ${l.pending}</div></div>
        <div><div class="badge" style="background:#ffebee;color:#c62828">${data.kpis.invoicesLate} ${l.late}</div></div>
      </div>
      ${progressBar(data.kpis.collectionRate, 100, data.kpis.collectionRate >= 70 ? '#0d9e6e' : '#d97706')}
    </div>

    <!-- Growth -->
    <div class="card">
      <div class="card-label">${l.growthIndicator}</div>
      <div style="margin-top:8px">
        <div class="card-label">${l.income30d}</div>
        <div class="card-value-sm">${fmt(data.kpis.recentIncome)}</div>
        <div class="card-trend ${data.trends.income.change >= 0 ? 'trend-down' : 'trend-up'}">${data.trends.income.change >= 0 ? '↑' : '↓'} ${pct(data.trends.income.change)} ${l.trend}</div>
      </div>
      <div style="margin-top:8px">
        <div class="card-label">${l.expenses30d}</div>
        <div class="card-value-sm">${fmt(data.kpis.recentExpenses)}</div>
        <div class="card-trend ${data.trends.expenses.change <= 0 ? 'trend-down' : 'trend-up'}">${data.trends.expenses.change >= 0 ? '↑' : '↓'} ${pct(data.trends.expenses.change)} ${l.trend}</div>
      </div>
    </div>
  </div>

  <!-- Top Expenses -->
  ${data.topExpenses.length > 0 ? `
  <div class="card-label mb-8">${l.topExpenses}</div>
  <table>
    <tr><th>${l.category}</th><th class="text-right">${l.amount}</th></tr>
    ${data.topExpenses.map(e => `<tr><td>${e.category}</td><td class="text-right font-bold">${fmt(e.amount)}</td></tr>`).join('')}
  </table>` : ''}

  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 3</span>
  </div>
</div>

<!-- ═══════════════════ PAGE 4: AI INSIGHTS ═══════════════════ -->
<div class="page">
  <div class="page-header">
    ${logo ? `<img src="${logo}">` : ''}
    <span class="page-title">${l.aiInsights}</span>
  </div>

  <div class="section-title">${l.aiInsights}</div>
  <div class="section-divider"></div>

  <!-- Anomalies -->
  <div class="card-label mb-8">${l.anomaliesDetected}</div>
  ${data.anomalies.length === 0 ? `<div class="alert-item alert-success">${l.noAnomalies}</div>` : `
  <table>
    <tr><th>${l.category}</th><th>${l.amount}</th><th>${l.expected}</th><th>${l.deviation}</th></tr>
    ${data.anomalies.map(a => `<tr>
      <td>${a.category}</td>
      <td class="font-bold">${fmt(a.amount)}</td>
      <td>${fmt(a.mean)} avg</td>
      <td><span class="badge" style="background:#ffebee;color:#c62828">${a.deviations}x ${a.direction}</span></td>
    </tr>`).join('')}
  </table>`}

  <!-- Trend Analysis -->
  <div class="card-label mb-8 mt-8">${l.trendAnalysis}</div>
  <table>
    <tr><th>${l.metric}</th><th>${l.current}</th><th>${l.previous}</th><th>${l.change}</th></tr>
    <tr>
      <td>${l.totalIncome}</td>
      <td class="font-bold">${fmt(data.trends.income.current)}</td>
      <td>${fmt(data.trends.income.previous)}</td>
      <td><span class="card-trend ${data.trends.income.change >= 0 ? 'trend-down' : 'trend-up'}">${pct(data.trends.income.change)}</span></td>
    </tr>
    <tr>
      <td>${l.totalExpenses}</td>
      <td class="font-bold">${fmt(data.trends.expenses.current)}</td>
      <td>${fmt(data.trends.expenses.previous)}</td>
      <td><span class="card-trend ${data.trends.expenses.change <= 0 ? 'trend-down' : 'trend-up'}">${pct(data.trends.expenses.change)}</span></td>
    </tr>
    <tr>
      <td>${l.netCashFlow}</td>
      <td class="font-bold" style="color:${data.trends.cashFlow.current >= 0 ? '#0d9e6e' : '#ba1a1a'}">${fmt(data.trends.cashFlow.current)}</td>
      <td>${fmt(data.trends.cashFlow.previous)}</td>
      <td><span class="card-trend">${pct(data.trends.cashFlow.change)}</span></td>
    </tr>
  </table>

  <!-- Risk Drivers -->
  <div class="card-label mb-8 mt-8">${l.riskDrivers}</div>
  ${data.explanations.map(text => `<div class="alert-item alert-info">${text}</div>`).join('')}

  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 4</span>
  </div>
</div>

<!-- ═══════════════════ PAGE 5: FORECASTS ═══════════════════ -->
<div class="page">
  <div class="page-header">
    ${logo ? `<img src="${logo}">` : ''}
    <span class="page-title">${l.forecastSection}</span>
  </div>

  <div class="section-title">${l.forecastSection}</div>
  <div class="section-divider"></div>

  <!-- Cash Flow Forecast -->
  <div class="card-label mb-8">${l.cashFlowForecast}</div>
  <div class="card-grid">
    <div class="card">
      <div class="card-label">${l.forecast30d}</div>
      <div class="card-value" style="color:${data.forecast.forecast30Days >= 0 ? '#0d9e6e' : '#ba1a1a'}">${fmt(data.forecast.forecast30Days)}</div>
      <div style="margin-top:8px;font-size:8px;color:#57657a">
        ${l.projectedIncome}: ${fmt(data.forecast.breakdown.projectedIncome)}<br>
        ${l.projectedExpenses}: ${fmt(data.forecast.breakdown.projectedExpenses)}<br>
        ${l.pendingInflow}: ${fmt(data.forecast.breakdown.pendingInvoiceInflow30)}<br>
        ${l.loanPayments}: ${fmt(data.forecast.breakdown.monthlyLoanPayments)}
      </div>
    </div>
    <div class="card">
      <div class="card-label">${l.forecast60d}</div>
      <div class="card-value" style="color:${data.forecast.forecast60Days >= 0 ? '#0d9e6e' : '#ba1a1a'}">${fmt(data.forecast.forecast60Days)}</div>
    </div>
  </div>

  <!-- Invoice Delay Risk -->
  ${data.invoiceRisks.length > 0 ? `
  <div class="card-label mb-8 mt-8">${l.invoiceDelayRisk}</div>
  <table>
    <tr><th>${l.client}</th><th>${l.amount}</th><th>${l.dueDate}</th><th>${l.riskScore}</th><th>${l.factors}</th></tr>
    ${data.invoiceRisks.slice(0, 6).map(ir => `<tr>
      <td class="font-bold">${ir.clientName}</td>
      <td>${fmt(ir.amount)}</td>
      <td>${new Date(ir.dueDate).toLocaleDateString()}</td>
      <td><span class="badge" style="background:${ir.riskScore >= 60 ? '#ffebee' : ir.riskScore >= 30 ? '#fff8e1' : '#e8f5e9'};color:${ir.riskScore >= 60 ? '#c62828' : ir.riskScore >= 30 ? '#f57f17' : '#2e7d32'}">${ir.riskScore}/100</span></td>
      <td style="font-size:8px;color:#57657a">${ir.factors.join(', ')}</td>
    </tr>`).join('')}
  </table>` : ''}

  <!-- Loan Stress Test -->
  ${data.loanStress.loans.length > 0 ? `
  <div class="card-label mb-8 mt-8">${l.loanStressTest}</div>
  <table>
    <tr><th>${l.amount}</th><th>${l.currentPayment}</th><th>${l.stressedPayment}</th><th>${l.increase}</th></tr>
    ${data.loanStress.loans.map(ls => `<tr>
      <td>${fmt(ls.amount)}</td>
      <td>${fmt(ls.currentPayment)}</td>
      <td class="font-bold" style="color:#ba1a1a">${fmt(ls.stressedPayment)}</td>
      <td><span class="badge" style="background:#ffebee;color:#c62828">+${fmt(ls.increase)} (${ls.percentIncrease}%)</span></td>
    </tr>`).join('')}
    <tr style="background:#f0f2f4;font-weight:700">
      <td>Total</td>
      <td>${fmt(data.loanStress.totals.totalCurrentPayment)}</td>
      <td style="color:#ba1a1a">${fmt(data.loanStress.totals.totalStressedPayment)}</td>
      <td><span class="badge" style="background:#ffebee;color:#c62828">+${fmt(data.loanStress.totals.additionalBurden)}</span></td>
    </tr>
  </table>` : ''}

  <!-- Predictions -->
  <div class="card-label mb-8 mt-8">Predictions</div>
  ${data.predictions.map(text => `<div class="alert-item alert-warning">${text}</div>`).join('')}

  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 5</span>
  </div>
</div>

<!-- ═══════════════════ PAGE 6: RECOMMENDATIONS ═══════════════════ -->
<div class="page">
  <div class="page-header">
    ${logo ? `<img src="${logo}">` : ''}
    <span class="page-title">${l.recommendations}</span>
  </div>

  <div class="section-title">${l.recommendations}</div>
  <div class="section-divider"></div>

  <!-- Priority Actions -->
  <div class="card-label mb-8">${l.priorityActions}</div>
  ${data.decision.priorityActions.map(a => {
    const urgColors = { critical: { bg: '#ffebee', text: '#c62828' }, high: { bg: '#fff3e0', text: '#e65100' }, medium: { bg: '#fff8e1', text: '#f57f17' }, low: { bg: '#e8f5e9', text: '#2e7d32' } };
    const c = urgColors[a.urgency] || urgColors.medium;
    return `<div class="priority-item">
      <div class="priority-num" style="background:${c.bg};color:${c.text}">${a.priority}</div>
      <div class="priority-content">
        <h4>${a.action}</h4>
        <p>${a.impact}</p>
        <span class="badge" style="background:${c.bg};color:${c.text};margin-top:4px">${a.urgency.toUpperCase()}</span>
      </div>
    </div>`;
  }).join('')}

  <!-- Additional Recommendations -->
  <div class="card-label mb-8 mt-8">${l.additionalReco}</div>
  ${data.recommendations.map(text => `<div class="alert-item alert-success">${text}</div>`).join('')}

  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 6</span>
  </div>
</div>

<!-- ═══════════════════ PAGE 7: APPENDIX ═══════════════════ -->
<div class="page">
  <div class="page-header">
    ${logo ? `<img src="${logo}">` : ''}
    <span class="page-title">${l.appendix}</span>
  </div>

  <div class="section-title">${l.appendix}</div>
  <div class="section-divider"></div>

  <!-- AI Confidence -->
  <div class="card mb-16">
    <div class="card-label">${l.aiConfidence}</div>
    <div class="card-value">${data.risk.confidence}%</div>
    ${progressBar(data.risk.confidence, 100, '#00355f')}
    <div style="margin-top:8px;font-size:8px;color:#57657a;line-height:1.7">${l.confidenceExplain}</div>
  </div>

  <!-- Model Logic -->
  <div class="card mb-16">
    <div class="card-label">${l.modelLogic}</div>
    <div style="font-size:9px;color:#191c1e;line-height:1.7;margin-top:6px">${l.modelExplain}</div>
  </div>

  <!-- Risk Calculation Summary -->
  <div class="card-label mb-8">${l.riskCalcSummary}</div>
  <table>
    <tr><th>${l.dimension}</th><th>${l.weight}</th><th>${l.score}</th><th>Visual</th></tr>
    ${Object.entries(data.risk.breakdown).map(([key, val]) => `<tr>
      <td class="font-bold">${key.replace(/([A-Z])/g, ' $1').trim()}</td>
      <td>${val.weight}</td>
      <td><span class="badge" style="background:${val.score >= 75 ? '#ffebee' : val.score >= 50 ? '#fff3e0' : val.score >= 25 ? '#fff8e1' : '#e8f5e9'};color:${val.score >= 75 ? '#c62828' : val.score >= 50 ? '#e65100' : val.score >= 25 ? '#f57f17' : '#2e7d32'}">${val.score}/100</span></td>
      <td style="width:120px">${progressBar(val.score, 100, riskBadgeColor(val.score >= 75 ? 'critical' : val.score >= 50 ? 'high' : val.score >= 25 ? 'moderate' : 'low'))}</td>
    </tr>`).join('')}
    <tr style="background:#f0f2f4;font-weight:700">
      <td>Global Score</td>
      <td>100%</td>
      <td><span class="badge" style="background:${riskColor}15;color:${riskColor}">${data.risk.globalScore}/100</span></td>
      <td>${progressBar(data.risk.globalScore, 100, riskColor)}</td>
    </tr>
  </table>

  <!-- Data Sources -->
  <div class="card mb-16">
    <div class="card-label">${l.dataSources}</div>
    <div style="font-size:8px;color:#57657a;line-height:1.8;margin-top:6px">
      ${data.counts.transactions} transactions · ${data.counts.invoices} invoices · ${data.counts.loans} loans · ${data.counts.assets} assets<br>
      ${l.generatedOn}: ${dateStr}
    </div>
  </div>

  <div class="page-footer">
    <span>${data.company.name} — ${l.confidential}</span>
    <span>${l.page} 7</span>
  </div>
</div>

</body>
</html>`;
}

module.exports = { generateReportHTML };
