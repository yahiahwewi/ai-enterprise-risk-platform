const cron = require('node-cron');
const { generatePDF } = require('./pdfGenerator');
const { analyzeRisk } = require('../aiService');
const { createNotification } = require('../notificationService');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

let schedulerRunning = false;

function startScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  // Monthly PDF report (1st of month at 08:00)
  cron.schedule('0 8 1 * *', async () => {
    console.log('[SCHEDULER] Monthly report generation started');
    await runMonthlyReports();
  });

  // Daily AI summary (every day at 07:00)
  cron.schedule('0 7 * * *', async () => {
    console.log('[SCHEDULER] Daily AI summary started');
    await runDailySummary();
  });

  // Weekly risk digest (Monday at 08:00)
  cron.schedule('0 8 * * 1', async () => {
    console.log('[SCHEDULER] Weekly risk digest started');
    await runWeeklyDigest();
  });

  console.log('[SCHEDULER] Initialized: monthly (1st 08:00), daily (07:00), weekly (Mon 08:00)');
}

async function runMonthlyReports() {
  try {
    const report = await generatePDF({ type: 'monthly', language: 'fr', generatedBy: 'scheduler' });
    console.log(`[SCHEDULER] Monthly report: ${report.title}`);
    return [{ status: 'success', reportId: report._id }];
  } catch (error) {
    console.error('[SCHEDULER] Monthly failed:', error.message);
    return [{ status: 'failed', error: error.message }];
  }
}

async function runDailySummary() {
  try {
    const yesterday = new Date(Date.now() - 86400000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const txs = await Transaction.find({ date: { $gte: yesterday, $lt: todayStart } });
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const report = await analyzeRisk('fr');

    const message = `Hier: ${txs.length} transaction(s) — ${income.toLocaleString('fr-FR')} TND revenus, ${expenses.toLocaleString('fr-FR')} TND dépenses. Score de risque: ${report.globalScore}/100 (${report.level}).`;

    const owners = await User.find({ role: 'owner', status: 'approved' }).select('_id');
    for (const owner of owners) {
      await createNotification({
        userId: owner._id,
        type: 'daily_summary',
        title: 'Résumé quotidien IA',
        message,
        severity: 'info',
        priority: 30,
        group: 'ai_prediction',
      });
    }
    console.log('[SCHEDULER] Daily summary sent');
  } catch (error) {
    console.error('[SCHEDULER] Daily failed:', error.message);
  }
}

async function runWeeklyDigest() {
  try {
    const report = await analyzeRisk('fr');
    const health = await require('../healthIndex').calculateHealthIndex();
    const f30 = report.forecast.forecast30Days;
    const f30str = (f30 < 0 ? '−' : '+') + Math.abs(f30).toLocaleString('fr-FR');

    const message = `Rapport hebdomadaire — Risque: ${report.globalScore}/100 (${report.level}). Santé financière: ${health.score}/100 (Grade ${health.grade}). Prévision 30j: ${f30str} TND.`;

    const owners = await User.find({ role: 'owner', status: 'approved' }).select('_id');
    for (const owner of owners) {
      await createNotification({
        userId: owner._id,
        type: 'weekly_report',
        title: 'Digest hebdomadaire IA',
        message,
        severity: report.globalScore >= 50 ? 'warning' : 'info',
        priority: 50,
        group: 'ai_prediction',
      });
    }
    console.log('[SCHEDULER] Weekly digest sent');
  } catch (error) {
    console.error('[SCHEDULER] Weekly failed:', error.message);
  }
}

module.exports = { startScheduler, runMonthlyReports };
