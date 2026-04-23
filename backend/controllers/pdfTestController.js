/**
 * pdfTestController.js
 * Dev sandbox for the signing + verification pipeline.
 *   POST /api/dev/pdf-test/generate  — produce a tiny signed PDF with a random
 *                                      signer name, sign it, stamp TSA, save as
 *                                      a Report doc so the normal /verify works.
 *   GET  /api/dev/pdf-test/:id       — download the raw signed PDF.
 */
const crypto    = require('crypto');
const fs        = require('fs');
const path      = require('path');
const puppeteer = require('puppeteer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Report    = require('../models/Report');
const { signPDF }                = require('../services/report/signAndHash');
const { appendVerificationPage } = require('../services/report/qrPage');
const { stampWithTSA }           = require('../services/report/tsaStamp');

const REPORTS_DIR = path.resolve(__dirname, '../reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// Pool of fake signer names used to demonstrate variable signer identity
const FAKE_NAMES = [
  'Yasmine Jebali', 'Anis Hamdi', 'Nour Ben Salah', 'Rami Chaabane',
  'Ines Trabelsi', 'Hedi Mrad', 'Sonia Ferchichi', 'Adel Khaldi',
  'Dorra Gharbi', 'Sami Zouari', 'Leila Souissi', 'Karim Attia',
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildHTML({ signerName, title, docId, issuedAt }) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><style>
  @page { size: A4; margin: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px 48px; color: #1f2937; }
  h1   { color: #00355f; font-size: 24pt; margin: 0 0 6px; letter-spacing: .4px; }
  .sub { color: #64748b; font-size: 11pt; margin-bottom: 24px; }
  .card { background:#f8fafc; border-left:4px solid #00355f; padding:18px 22px; border-radius: 8px; margin:16px 0; }
  .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e2e8f0; font-size: 11pt; }
  .row:last-child { border-bottom:0; }
  .k { color:#64748b; font-weight:600; }
  .v { color:#0f172a; font-weight:700; font-family: 'SFMono-Regular', Menlo, Consolas, monospace; }
  .badge { display:inline-block; background:#003355; color:white; padding:4px 10px; border-radius: 999px; font-size: 9pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .disclaimer { margin-top:28px; font-size: 9pt; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px; }
  .big-name { font-size: 36pt; color:#003355; font-weight: 800; margin: 24px 0; letter-spacing: .6px; }
</style></head>
<body>
  <span class="badge">Tac-Tic ERM · Test Signature</span>
  <h1>${title}</h1>
  <div class="sub">Document de test pour valider la chaîne de signature RSA-SHA256 + RFC 3161 TSA.</div>

  <div class="card">
    <div class="row"><span class="k">Signataire</span><span class="v">${signerName}</span></div>
    <div class="row"><span class="k">Identifiant du document</span><span class="v">${docId}</span></div>
    <div class="row"><span class="k">Émis le</span><span class="v">${issuedAt}</span></div>
    <div class="row"><span class="k">Objet</span><span class="v">Test d'intégrité — modification détectée via SHA-256</span></div>
  </div>

  <div class="big-name">${signerName}</div>

  <p style="font-size:11pt; line-height:1.5;">
    Ce document est signé numériquement par <strong>${signerName}</strong>. Toute modification ultérieure
    du contenu (texte, champs, métadonnées) sera détectée lors de la vérification, car l'empreinte SHA-256
    ne correspondra plus à celle enregistrée au moment de la signature.
  </p>

  <p class="disclaimer">Document généré par <code>/api/dev/pdf-test/generate</code> — environnement de test uniquement.</p>
</body></html>`;
}

// POST /api/dev/pdf-test/generate
exports.generate = async (req, res) => {
  try {
    const signerName = pick(FAKE_NAMES);
    const docId      = 'TST-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const issuedAt   = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const title      = `Attestation de test — ${docId}`;

    const html = buildHTML({ signerName, title, docId, issuedAt });

    // 1. Puppeteer → raw PDF
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const rawPdfBytes = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();
    let pdfBuffer = Buffer.from(rawPdfBytes);

    // 2. Persist the Report row first so we have its _id for the QR page
    const filename = `test_${docId}_${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, filename);

    const report = await Report.create({
      type:            'decision', // reuse existing enum value for tests
      title,
      period:          new Date().toISOString().slice(0, 7),
      language:        'fr',
      version:         1,
      filename,
      filePath,
      generatedBy:     'api',
      generatedByUser: req.user?._id,
      generatedByName: signerName, // ← the random name is the signer shown in UI
      status:          'generating',
    });

    // 3. Pre-hash + TSA
    const prehash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const { tsaToken, tsaStatus, tsaTimestamp, tsaIssuer } = await stampWithTSA(prehash);

    // 4. Append QR verification page (before signing → file-on-disk matches signed hash)
    pdfBuffer = await appendVerificationPage(pdfBuffer, {
      reportId:    report._id,
      hash:        prehash,
      certCN:      signerName,
      signedAt:    new Date(),
      tsaStatus, tsaIssuer, tsaTimestamp,
    });

    // 5. Sign the final buffer
    const { hash, signature, certCN, certPem, signedAt } = signPDF(pdfBuffer);

    // 6. Write file
    fs.writeFileSync(filePath, pdfBuffer);

    // 7. Finalise Report doc
    const stats = fs.statSync(filePath);
    report.status    = 'ready';
    report.fileSize  = stats.size;
    report.hash      = hash;
    report.signature = signature;
    report.certCN    = certCN;
    report.certPem   = certPem;
    report.signedAt  = signedAt;
    if (tsaToken)    report.tsaToken     = tsaToken;
    report.tsaStatus    = tsaStatus;
    report.tsaTimestamp = tsaTimestamp;
    report.tsaIssuer    = tsaIssuer;
    await report.save();

    res.status(201).json({
      id:           report._id,
      title,
      signerName,
      docId,
      issuedAt,
      hash,
      tsaStatus,
      tsaTimestamp,
      tsaIssuer,
      fileSize:     stats.size,
      downloadUrl:  `/api/dev/pdf-test/${report._id}`,
      verifyUrl:    `/verify/${report._id}`,
    });
  } catch (err) {
    console.error('[PDF-TEST]', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/dev/pdf-test/:id/tamper
//   Simulates an unauthorised post-signature edit:
//     - loads the PDF that was signed and saved on disk,
//     - uses pdf-lib to stamp a visible "EDITED" annotation (and optional custom
//       note provided by the user),
//     - overwrites the file on disk WITHOUT re-signing and WITHOUT touching
//       the stored hash.
//   The next verify-upload call will therefore report `hashIntact: false`.
exports.tamper = async (req, res) => {
  try {
    const { note } = req.body || {};
    const report = await Report.findById(req.params.id);
    if (!report)                      return res.status(404).json({ message: 'Not found' });
    if (!fs.existsSync(report.filePath)) return res.status(404).json({ message: 'File missing' });

    const original = fs.readFileSync(report.filePath);
    const pdfDoc   = await PDFDocument.load(original);
    const font     = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 1) Big red banner stamped on the FIRST page
    const firstPage = pdfDoc.getPage(0);
    const { width }  = firstPage.getSize();
    firstPage.drawRectangle({ x: 0, y: 40, width, height: 50, color: rgb(1, 0.2, 0.2), opacity: 0.85 });
    firstPage.drawText('* EDIT POST-SIGNATURE *', {
      x: 40, y: 58, size: 18, font, color: rgb(1, 1, 1),
    });
    firstPage.drawText('Contenu modifié après signature — l\'empreinte SHA-256 ne correspond plus.', {
      x: 40, y: 44, size: 8, font: fontReg, color: rgb(1, 1, 1),
    });

    // 2) Optional custom note appended as a new page
    if (note && String(note).trim().length > 0) {
      const page = pdfDoc.addPage([595, 842]);
      page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: rgb(0.98, 0.85, 0.85) });
      page.drawText('PAGE AJOUTÉE APRÈS SIGNATURE', {
        x: 40, y: 805, size: 16, font, color: rgb(0.7, 0.1, 0.1),
      });
      page.drawText('Ceci est un contenu ajouté manuellement, qui invalide la signature.', {
        x: 40, y: 790, size: 9, font: fontReg, color: rgb(0.5, 0.1, 0.1),
      });
      // Wrap the note across lines
      const words = String(note).split(/\s+/);
      let line = ''; let y = 750;
      const maxWidth = 515;
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        const wpx = fontReg.widthOfTextAtSize(test, 12);
        if (wpx > maxWidth) {
          page.drawText(line, { x: 40, y, size: 12, font: fontReg, color: rgb(0.1, 0.12, 0.15) });
          line = w; y -= 18;
        } else {
          line = test;
        }
        if (y < 60) break;
      }
      if (line) page.drawText(line, { x: 40, y, size: 12, font: fontReg, color: rgb(0.1, 0.12, 0.15) });
    }

    const tamperedBytes = await pdfDoc.save();
    fs.writeFileSync(report.filePath, Buffer.from(tamperedBytes));
    const size = fs.statSync(report.filePath).size;
    const currentHash = crypto.createHash('sha256').update(tamperedBytes).digest('hex');

    res.json({
      tampered:    true,
      filePath:    report.filename,
      size,
      storedHash:  report.hash,            // unchanged in DB
      currentHash,                         // new SHA-256 of the on-disk file
      hashMatches: currentHash === report.hash,
      message:     'Fichier édité sur le disque. La signature stockée n\'a pas changé → la prochaine vérification signalera une incohérence.',
    });
  } catch (err) {
    console.error('[PDF-TEST TAMPER]', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dev/pdf-test/:id — stream the raw signed PDF (requires auth via ?token=)
exports.download = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Not found' });
    if (!fs.existsSync(report.filePath)) return res.status(404).json({ message: 'File missing' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.filename}"`);
    res.sendFile(path.resolve(report.filePath));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
