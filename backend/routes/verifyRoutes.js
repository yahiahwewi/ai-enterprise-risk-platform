/**
 * verifyRoutes.js
 * Layer 3 — Public, unauthenticated endpoints for report verification.
 *   GET  /api/verify/:id       — verify a known report by id
 *   POST /api/verify/upload    — upload any PDF, match by SHA-256, verify
 */
const express  = require('express');
const crypto   = require('crypto');
const fs       = require('fs');
const multer   = require('multer');
const router   = express.Router();
const Report   = require('../models/Report');
const { verifyPDF } = require('../services/report/signAndHash');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function reportMeta(report) {
  return {
    id:               report._id,
    title:            report.title,
    type:             report.type,
    language:         report.language,
    period:           report.period,
    version:          report.version,
    fileSize:         report.fileSize,
    createdAt:        report.createdAt,
    signedAt:         report.signedAt,
    signerCN:         report.certCN,
    generatedByName:  report.generatedByName || null,
    hash:             report.hash,
  };
}

function tsaMeta(report) {
  return {
    status:    report.tsaStatus    || 'none',
    timestamp: report.tsaTimestamp || null,
    issuer:    report.tsaIssuer    || null,
  };
}

function verifyFromBuffer(report, pdfBuffer) {
  const result = verifyPDF(pdfBuffer, report.hash, report.signature, report.certPem);
  return {
    hashMatch:      result.hashMatch,
    signatureValid: result.signatureValid,
    currentHash:    result.currentHash,
  };
}

/**
 * GET /api/verify/:id
 * Verifies the stored on-disk PDF against its stored hash + signature.
 */
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).select(
      'title type language period version status hash signature certCN certPem signedAt ' +
      'tsaStatus tsaTimestamp tsaIssuer createdAt fileSize filePath generatedByName'
    );

    if (!report) {
      return res.status(404).json({ verified: false, error: 'Report not found' });
    }

    if (report.status !== 'ready') {
      return res.json({ verified: false, status: report.status, title: report.title });
    }

    if (!report.hash || !report.signature || !report.certPem) {
      return res.json({
        verified: false,
        reason:   'no_signature',
        title:    report.title,
        report:   reportMeta(report),
      });
    }

    let fileExists = false;
    let hashMatch = false;
    let signatureValid = false;

    if (fs.existsSync(report.filePath)) {
      fileExists = true;
      const pdfBuffer = fs.readFileSync(report.filePath);
      const r = verifyFromBuffer(report, pdfBuffer);
      hashMatch      = r.hashMatch;
      signatureValid = r.signatureValid;
    }

    const allGood = fileExists && hashMatch && signatureValid;

    return res.json({
      verified: allGood,
      checks: {
        fileFound:      fileExists,
        hashIntact:     hashMatch,
        signatureValid,
      },
      report: reportMeta(report),
      tsa:    tsaMeta(report),
    });
  } catch (err) {
    console.error('[VERIFY]', err.message);
    return res.status(500).json({ verified: false, error: 'Verification error' });
  }
});

/**
 * POST /api/verify/upload
 * Anyone can upload a PDF and we match it by SHA-256 hash to a known report.
 * Body: multipart/form-data with field "file".
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ verified: false, error: 'No file uploaded' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ verified: false, error: 'Only PDF files are accepted' });
    }

    const pdfBuffer = req.file.buffer;
    const uploadedHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Try to match by exact hash first
    let report = await Report.findOne({ hash: uploadedHash }).select(
      'title type language period version status hash signature certCN certPem signedAt ' +
      'tsaStatus tsaTimestamp tsaIssuer createdAt fileSize filePath generatedByName'
    );

    if (report && report.signature && report.certPem) {
      // Exact match on hash — the file is a byte-identical copy of an issued report.
      const r = verifyFromBuffer(report, pdfBuffer);
      return res.json({
        verified: r.hashMatch && r.signatureValid,
        matched:  true,
        upload:   { filename: req.file.originalname, size: req.file.size, hash: uploadedHash },
        checks: {
          fileFound:      true,      // the uploaded file *is* the document
          hashIntact:     r.hashMatch,
          signatureValid: r.signatureValid,
        },
        report: reportMeta(report),
        tsa:    tsaMeta(report),
      });
    }

    // No exact match — tell the user, but give them helpful info if any
    // same-title report exists.
    return res.json({
      verified: false,
      matched:  false,
      reason:   'no_match',
      upload:   { filename: req.file.originalname, size: req.file.size, hash: uploadedHash },
      message:  'No Tac-Tic ERM report matches this file\'s SHA-256. It may have been edited after signature, or it is not one of our signed reports.',
    });
  } catch (err) {
    console.error('[VERIFY UPLOAD]', err.message);
    return res.status(500).json({ verified: false, error: 'Verification error' });
  }
});

module.exports = router;
