/**
 * Monthly Report Scheduler
 *
 * Uses node-cron to auto-generate PDF reports on the 1st of each month at 08:00.
 * For each company in the database, generates a monthly executive report.
 */

const cron = require('node-cron');
const Company = require('../../models/Company');
const { generatePDF } = require('./pdfGenerator');

let schedulerRunning = false;

function startScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  // Run on the 1st of every month at 08:00
  cron.schedule('0 8 1 * *', async () => {
    console.log('[SCHEDULER] Monthly report generation started:', new Date().toISOString());
    await runMonthlyReports();
  });

  console.log('[SCHEDULER] Monthly report scheduler initialized (1st of month, 08:00)');
}

async function runMonthlyReports() {
  try {
    const companies = await Company.find();
    console.log(`[SCHEDULER] Generating reports for ${companies.length} companies...`);

    const results = [];
    for (const company of companies) {
      try {
        // Generate FR version
        const report = await generatePDF(company._id, {
          type: 'monthly',
          language: 'fr',
          generatedBy: 'scheduler',
        });
        results.push({ companyId: company._id, companyName: company.name, status: 'success', reportId: report._id });
        console.log(`[SCHEDULER] Report generated for ${company.name}`);
      } catch (error) {
        results.push({ companyId: company._id, companyName: company.name, status: 'failed', error: error.message });
        console.error(`[SCHEDULER] Failed for ${company.name}:`, error.message);
      }
    }

    console.log(`[SCHEDULER] Monthly generation complete: ${results.filter(r => r.status === 'success').length}/${results.length} successful`);
    return results;
  } catch (error) {
    console.error('[SCHEDULER] Fatal error:', error.message);
    throw error;
  }
}

module.exports = { startScheduler, runMonthlyReports };
