/**
 * qrPage.js
 * Layer 3 — Appends a verification QR page to an existing PDF buffer.
 * Uses pdf-lib (pure JS) + qrcode (pure JS). Zero cost, no DevOps.
 */
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const QRCode = require('qrcode');

const BASE_URL = process.env.FRONTEND_URL || 'https://tac-tic.net';

/**
 * Append a verification page to the PDF.
 * @param {Buffer}  pdfBuffer
 * @param {object}  meta  { reportId, hash, certCN, signedAt, otsStatus }
 * @returns {Buffer}  new PDF bytes with verification page
 */
async function appendVerificationPage(pdfBuffer, meta) {
  const { reportId, hash, certCN, signedAt,
          tsaStatus = 'none', tsaIssuer = null, tsaTimestamp = null } = meta;
  const verifyUrl = `${BASE_URL}/verify/${reportId}`;

  // 1. Generate QR PNG as Buffer
  const qrPng = await QRCode.toBuffer(verifyUrl, {
    type: 'png',
    width: 200,
    margin: 2,
    color: { dark: '#00355f', light: '#ffffff' },
  });

  // 2. Load existing PDF
  const pdfDoc  = await PDFDocument.load(pdfBuffer);
  const font    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const qrImg   = await pdfDoc.embedPng(qrPng);

  // 3. Add new A4 page
  const page = pdfDoc.addPage([595, 842]); // A4 pt
  const { width, height } = page.getSize();

  // Background — light slate
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.97, 0.98, 0.98) });

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0, 0.208, 0.373) }); // #00355f

  // Header text
  page.drawText('RAPPORT CERTIFIÉ / CERTIFIED REPORT', {
    x: 40, y: height - 48,
    size: 14, font, color: rgb(1, 1, 1),
  });
  page.drawText('Verification d\'authenticite / Authenticity Verification', {
    x: 40, y: height - 66,
    size: 9, font: fontReg, color: rgb(0.75, 0.85, 0.95),
  });

  // QR code (centered-ish)
  const qrSize = 160;
  const qrX    = width / 2 - qrSize / 2;
  const qrY    = height - 80 - 30 - qrSize;
  page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  // Scan instruction
  page.drawText('Scannez pour verifier / Scan to verify', {
    x: width / 2 - 90, y: qrY - 18,
    size: 9, font: fontReg, color: rgb(0.35, 0.4, 0.45),
  });

  // Divider
  const divY = qrY - 38;
  page.drawLine({ start: { x: 40, y: divY }, end: { x: width - 40, y: divY }, thickness: 0.5, color: rgb(0.8, 0.83, 0.86) });

  // Metadata table
  const tsaLabel = tsaStatus === 'ok'
    ? `[OK] ${tsaIssuer || 'TSA'} - ${tsaTimestamp ? new Date(tsaTimestamp).toISOString().slice(0, 19) + ' UTC' : ''}`
    : tsaStatus === 'failed' ? 'Indisponible' : 'Non demande';

  const rows = [
    ['Rapport ID',           reportId.toString()],
    ['Signataire / Signer',  certCN],
    ['Date de signature',    new Date(signedAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'],
    ['Horodatage TSA',       tsaLabel],
    ['Verifier sur',         `${BASE_URL}/verify/${reportId}`],
  ];

  let rowY = divY - 20;
  for (const [label, value] of rows) {
    page.drawText(label + ' :', {
      x: 40, y: rowY,
      size: 8.5, font, color: rgb(0.25, 0.3, 0.35),
    });
    page.drawText(value, {
      x: 180, y: rowY,
      size: 8.5, font: fontReg, color: rgb(0.1, 0.12, 0.15),
    });
    rowY -= 20;
  }

  // Footer
  page.drawLine({ start: { x: 40, y: 60 }, end: { x: width - 40, y: 60 }, thickness: 0.5, color: rgb(0.8, 0.83, 0.86) });
  page.drawText('Ce document a ete signe numeriquement par Tac-Tic ERM. La signature RSA-SHA256 garantit son integrite.', {
    x: 40, y: 44, size: 7, font: fontReg, color: rgb(0.5, 0.55, 0.6),
  });
  page.drawText('This document was digitally signed by Tac-Tic ERM. The RSA-SHA256 signature guarantees its integrity.', {
    x: 40, y: 30, size: 7, font: fontReg, color: rgb(0.5, 0.55, 0.6),
  });

  // Serialize
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

module.exports = { appendVerificationPage };
