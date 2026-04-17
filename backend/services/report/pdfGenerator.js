const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const { generateReportHTML }    = require('../../templates/reportTemplate');
const { buildReportData }       = require('./reportDataService');
const Report                    = require('../../models/Report');
const { createNotification }    = require('../notificationService');
const User                      = require('../../models/User');
const { signPDF }               = require('./signAndHash');
const { appendVerificationPage }= require('./qrPage');
const { stampWithTSA }          = require('./tsaStamp');

const REPORTS_DIR = path.resolve(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

async function generatePDF(options = {}) {
  const { type = 'monthly', language = 'fr', generatedBy = 'manual', user = null } = options;
  const userName = user?.name || user?.email || (generatedBy === 'scheduler' ? 'System (auto)' : 'Unknown user');
  const userId   = user?._id || null;

  // ── 1. Build report data ──────────────────────────────────────────────────
  const reportData = await buildReportData(language);

  const filename = `report_${type}_${reportData.periodCode}_${language}_v${Date.now()}.pdf`;
  const filePath = path.join(REPORTS_DIR, filename);

  const existingCount = await Report.countDocuments({ type, period: reportData.periodCode });

  const report = await Report.create({
    type,
    title: `${type === 'monthly'
      ? (language === 'fr' ? 'Rapport Mensuel' : 'Monthly Report')
      : (language === 'fr' ? 'Rapport de Décision IA' : 'AI Decision Report')
    } — ${reportData.period}`,
    period: reportData.periodCode,
    language,
    version: existingCount + 1,
    filename,
    filePath,
    data: {
      globalScore: reportData.risk.globalScore,
      level:       reportData.risk.level,
      decision:    reportData.decision.decision,
      confidence:  reportData.risk.confidence,
    },
    generatedBy,
    generatedByUser: userId,
    generatedByName: userName,
    status: 'generating',
  });

  try {
    // ── 2. Puppeteer → raw PDF bytes ─────────────────────────────────────────
    const html    = generateReportHTML(reportData);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const rawPdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await browser.close();

    let pdfBuffer = Buffer.from(rawPdfBytes);

    // ── Layer 3a: TSA timestamp over a pre-hash (needed for QR page metadata) ─
    const prehash = require('crypto').createHash('sha256').update(pdfBuffer).digest('hex');
    const { tsaToken, tsaStatus, tsaTimestamp, tsaIssuer } = await stampWithTSA(prehash);

    // ── Layer 3: Append QR verification page BEFORE signing ──────────────────
    //   (So the final file on disk = what was signed. The QR page intentionally
    //    does not embed the final hash to avoid a chicken-and-egg loop.)
    const signedAtPreview = new Date();
    pdfBuffer = await appendVerificationPage(pdfBuffer, {
      reportId:    report._id,
      hash:        prehash,
      certCN:      userName, // actual user name shown as "Signataire" on the QR page
      signedAt:    signedAtPreview,
      tsaStatus,
      tsaIssuer,
      tsaTimestamp,
    });

    // ── Layer 1 & 2: Sign the FINAL PDF (what actually lives on disk) ────────
    const { hash, signature, certCN, certPem, signedAt } = signPDF(pdfBuffer);
    console.log(`[SIGN] SHA-256: ${hash.slice(0, 16)}… | Signer: ${certCN}`);

    // ── 3. Write final PDF to disk ────────────────────────────────────────────
    fs.writeFileSync(filePath, pdfBuffer);

    // ── 4. Update MongoDB record ──────────────────────────────────────────────
    const stats = fs.statSync(filePath);
    report.status   = 'ready';
    report.fileSize = stats.size;
    // Layer 1 & 2
    report.hash      = hash;
    report.signature = signature;
    report.certCN    = certCN;
    report.certPem   = certPem;
    report.signedAt  = signedAt;
    // Layer 3b — TSA
    if (tsaToken)    report.tsaToken     = tsaToken;
    report.tsaStatus    = tsaStatus;
    report.tsaTimestamp = tsaTimestamp;
    report.tsaIssuer    = tsaIssuer;
    await report.save();

    // ── 5. Notify owner ───────────────────────────────────────────────────────
    const owner = await User.findOne({ role: 'owner' }).select('_id');
    if (owner) {
      await createNotification({
        userId: owner._id,
        type:   'system',
        title:  language === 'fr' ? 'Rapport certifié prêt' : 'Certified report ready',
        message: language === 'fr'
          ? `Rapport "${report.title}" signé et horodaté.`
          : `Report "${report.title}" signed and timestamped.`,
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
