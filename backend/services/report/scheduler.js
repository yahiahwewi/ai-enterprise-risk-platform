const cron = require('node-cron');
const { generatePDF } = require('./pdfGenerator');

let schedulerRunning = false;

function startScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  cron.schedule('0 8 1 * *', async () => {
    console.log('[SCHEDULER] Monthly report generation started:', new Date().toISOString());
    await runMonthlyReports();
  });

  console.log('[SCHEDULER] Monthly report scheduler initialized (1st of month, 08:00)');
}

async function runMonthlyReports() {
  try {
    const report = await generatePDF({ type: 'monthly', language: 'fr', generatedBy: 'scheduler' });
    console.log(`[SCHEDULER] Report generated: ${report.title}`);
    return [{ status: 'success', reportId: report._id, title: report.title }];
  } catch (error) {
    console.error('[SCHEDULER] Failed:', error.message);
    return [{ status: 'failed', error: error.message }];
  }
}

module.exports = { startScheduler, runMonthlyReports };
