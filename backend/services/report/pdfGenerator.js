/**
 * PDF Generator Service
 *
 * Pipeline: Report Data → HTML Template → Puppeteer → PDF File
 *
 * Uses Puppeteer to render the HTML template as a high-quality PDF
 * with proper A4 sizing, embedded fonts, and print media styles.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { generateReportHTML } = require('../../templates/reportTemplate');
const { buildReportData } = require('./reportDataService');
const Report = require('../../models/Report');
const { createNotification } = require('../notificationService');
const User = require('../../models/User');

const REPORTS_DIR = path.resolve(__dirname, '../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function generatePDF(companyId, options = {}) {
  const {
    type = 'monthly',
    language = 'fr',
    generatedBy = 'manual',
  } = options;

  // 1. Build report data
  const reportData = await buildReportData(companyId, language);

  // 2. Create DB record (status: generating)
  const now = new Date();
  const filename = `report_${type}_${reportData.periodCode}_${language}_v${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);

  // Check for existing version this period
  const existingCount = await Report.countDocuments({
    companyId, type, period: reportData.periodCode,
  });

  const report = await Report.create({
    companyId,
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
    // 3. Generate HTML
    const html = generateReportHTML(reportData);

    // 4. Render PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    // 5. Update DB record
    const stats = fs.statSync(filePath);
    report.status = 'ready';
    report.fileSize = stats.size;
    await report.save();

    // 6. Notify owner
    const owner = await User.findOne({ companyId, role: 'owner' }).select('_id');
    if (owner) {
      await createNotification({
        userId: owner._id,
        companyId,
        type: 'system',
        title: language === 'fr' ? 'Rapport prêt' : 'Report ready',
        message: language === 'fr'
          ? `Votre rapport "${report.title}" est prêt au téléchargement.`
          : `Your report "${report.title}" is ready for download.`,
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
