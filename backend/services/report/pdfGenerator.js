const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { generateReportHTML } = require('../../templates/reportTemplate');
const { buildReportData } = require('./reportDataService');
const Report = require('../../models/Report');
const { createNotification } = require('../notificationService');
const User = require('../../models/User');

const REPORTS_DIR = path.resolve(__dirname, '../../reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function generatePDF(options = {}) {
  const { type = 'monthly', language = 'fr', generatedBy = 'manual' } = options;

  // 1. Build report data (single company — no companyId needed)
  const reportData = await buildReportData(language);

  // 2. Create DB record
  const filename = `report_${type}_${reportData.periodCode}_${language}_v${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);

  const existingCount = await Report.countDocuments({ type, period: reportData.periodCode });

  const report = await Report.create({
    type,
    title: `${type === 'monthly' ? (language === 'fr' ? 'Rapport Mensuel' : 'Monthly Report') : (language === 'fr' ? 'Rapport de Décision IA' : 'AI Decision Report')} — ${reportData.period}`,
    period: reportData.periodCode,
    language,
    version: existingCount + 1,
    filename,
    filePath,
    data: {
      globalScore: reportData.risk.globalScore,
      level: reportData.risk.level,
      decision: reportData.decision.decision,
      confidence: reportData.risk.confidence,
    },
    generatedBy,
    status: 'generating',
  });

  try {
    // 3. Generate HTML → PDF
    const html = generateReportHTML(reportData);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: filePath, format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();

    // 4. Update record
    const stats = fs.statSync(filePath);
    report.status = 'ready';
    report.fileSize = stats.size;
    await report.save();

    // 5. Notify owner
    const owner = await User.findOne({ role: 'owner' }).select('_id');
    if (owner) {
      await createNotification({
        userId: owner._id,
        type: 'system',
        title: language === 'fr' ? 'Rapport prêt' : 'Report ready',
        message: language === 'fr' ? `Votre rapport "${report.title}" est prêt.` : `Your report "${report.title}" is ready.`,
        severity: 'info',
        metadata: { reportId: report._id },
      });
    }

    return report;
  } catch (error) {
    report.status = 'failed';
    await report.save();
    throw error;
  }
}

module.exports = { generatePDF, REPORTS_DIR };
