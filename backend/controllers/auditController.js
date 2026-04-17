/**
 * auditController.js
 * Read-only endpoints for the Auditor role.
 * Aggregates integrity state of invoices + certification state of reports
 * + recent critical activity so the auditor has a single "audit dashboard".
 */
const fs = require('fs');
const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Report  = require('../models/Report');
const ActivityLog = require('../models/ActivityLog');
const { checkIntegrity } = require('../services/invoiceIntegrity');
const { verifyPDF } = require('../services/report/signAndHash');

// GET /api/audit/summary — high-level audit KPIs
exports.getAuditSummary = async (req, res) => {
  try {
    // ── Invoice integrity ─────────────────────────────────────────────────
    const invoices = await Invoice.find({}).select(
      'clientName amount issueDate dueDate description reference category ' +
      'integrityHash integrityHashedAt integritySnapshot'
    );
    const invoiceResults = invoices.map((inv) => {
      const r = checkIntegrity(inv.toObject());
      return {
        invoiceId:   inv._id,
        clientName:  inv.clientName,
        amount:      inv.amount,
        intact:      r.intact,
        changedFields: r.changedFields,
      };
    });
    const invoiceSummary = {
      total:     invoiceResults.length,
      original:  invoiceResults.filter((r) => r.intact === true).length,
      modified:  invoiceResults.filter((r) => r.intact === false).length,
      untracked: invoiceResults.filter((r) => r.intact === null).length,
    };

    // ── Report certification ──────────────────────────────────────────────
    const reports = await Report.find({ status: 'ready' }).select(
      'title type period version hash signature certPem certCN signedAt ' +
      'tsaStatus tsaTimestamp tsaIssuer filePath generatedByName createdAt fileSize'
    );
    const reportResults = reports.map((rep) => {
      let verified   = false;
      let fileExists = false;
      let hashMatch  = false;
      let sigValid   = false;
      let reason     = null;

      if (!rep.hash || !rep.signature || !rep.certPem) {
        reason = 'no_signature';
      } else if (!fs.existsSync(rep.filePath)) {
        reason = 'file_missing';
      } else {
        fileExists = true;
        try {
          const buf = fs.readFileSync(rep.filePath);
          const r = verifyPDF(buf, rep.hash, rep.signature, rep.certPem);
          hashMatch = r.hashMatch;
          sigValid  = r.signatureValid;
          verified  = r.hashMatch && r.signatureValid;
          if (!verified) reason = hashMatch ? 'bad_signature' : 'hash_mismatch';
        } catch {
          reason = 'verification_error';
        }
      }

      return {
        id:              rep._id,
        title:           rep.title,
        type:            rep.type,
        period:          rep.period,
        version:         rep.version,
        generatedByName: rep.generatedByName || rep.certCN || null,
        createdAt:       rep.createdAt,
        fileSize:        rep.fileSize,
        tsaStatus:       rep.tsaStatus,
        verified,
        checks:          { fileFound: fileExists, hashIntact: hashMatch, signatureValid: sigValid },
        reason,
      };
    });
    const reportSummary = {
      total:      reportResults.length,
      verified:   reportResults.filter((r) => r.verified).length,
      altered:    reportResults.filter((r) => r.reason === 'hash_mismatch').length,
      unsigned:   reportResults.filter((r) => r.reason === 'no_signature').length,
      missing:    reportResults.filter((r) => r.reason === 'file_missing').length,
    };

    // ── Recent activity (30 days) ─────────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let recentActivity = [];
    try {
      recentActivity = await ActivityLog.find({ createdAt: { $gte: thirtyDaysAgo } })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('userId', 'name email role')
        .lean();
    } catch { /* ActivityLog model might not exist */ }

    res.json({
      generatedAt: new Date(),
      invoices: { summary: invoiceSummary, items: invoiceResults },
      reports:  { summary: reportSummary,  items: reportResults  },
      activity: { recent: recentActivity },
    });
  } catch (err) {
    console.error('[AUDIT SUMMARY]', err);
    res.status(500).json({ message: err.message });
  }
};
