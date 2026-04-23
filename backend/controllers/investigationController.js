/**
 * investigationController.js
 * Full CRUD for forensic investigations owned by the Auditor role.
 * The final "close & export" flow generates a signed PDF (RSA-SHA256 + TSA)
 * that reuses the regular Report pipeline so it appears on /verify pages too.
 */
const crypto    = require('crypto');
const fs        = require('fs');
const path      = require('path');
const puppeteer = require('puppeteer');

const Investigation = require('../models/Investigation');
const Report        = require('../models/Report');
const Invoice       = require('../models/Invoice');
const Transaction   = require('../models/Transaction');
const Loan          = require('../models/Loan');
const User          = require('../models/User');

const { signPDF }                = require('../services/report/signAndHash');
const { appendVerificationPage } = require('../services/report/qrPage');
const { stampWithTSA }           = require('../services/report/tsaStamp');

const REPORTS_DIR = path.resolve(__dirname, '../reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

function canSee(user, inv) {
  if (['owner', 'admin'].includes(user.role)) return true;
  return String(inv.auditorId) === String(user._id);
}

// GET /api/investigations
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'auditor') filter.auditorId = req.user._id;
    const list = await Investigation.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/investigations/:id
exports.getOne = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id).lean();
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (!canSee(req.user, inv)) return res.status(403).json({ message: 'Forbidden' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/investigations
exports.create = async (req, res) => {
  try {
    const { title, subject } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Le titre est obligatoire' });
    const inv = await Investigation.create({
      title:       title.trim(),
      subject:     subject || '',
      auditorId:   req.user._id,
      auditorName: req.user.name,
      timeline:    [{
        text: 'Investigation ouverte.',
        severity: 'info',
        authorId: req.user._id,
        authorName: req.user.name,
      }],
    });
    res.status(201).json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/investigations/:id  — update title/subject/conclusion
exports.update = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (!canSee(req.user, inv)) return res.status(403).json({ message: 'Forbidden' });
    if (inv.status === 'closed') return res.status(400).json({ message: 'Investigation clôturée' });

    const { title, subject, conclusion } = req.body;
    if (title !== undefined) inv.title = title;
    if (subject !== undefined) inv.subject = subject;
    if (conclusion !== undefined) inv.conclusion = conclusion;
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/investigations/:id — auditor (author) or admin only
exports.remove = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Not found' });
    const isAuthor = String(inv.auditorId) === String(req.user._id);
    if (!isAuthor && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await inv.deleteOne();
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper: build a human-friendly label for an entity based on its kind
async function buildEntityLabel(kind, entityId) {
  try {
    if (kind === 'invoice') {
      const i = await Invoice.findById(entityId).select('clientName amount status reference').lean();
      if (!i) return { label: `Facture ${entityId}`, amount: null };
      const ref = i.reference ? ` (${i.reference})` : '';
      return {
        label:  `Facture · ${i.clientName}${ref} · ${i.amount?.toLocaleString('fr-FR')} TND · ${i.status}`,
        amount: i.amount,
      };
    }
    if (kind === 'transaction') {
      const t = await Transaction.findById(entityId).select('type amount category description').lean();
      if (!t) return { label: `Transaction ${entityId}`, amount: null };
      return {
        label:  `Transaction · ${t.type} · ${t.amount?.toLocaleString('fr-FR')} TND · ${t.category}`,
        amount: t.amount,
      };
    }
    if (kind === 'loan') {
      const l = await Loan.findById(entityId).select('amount interestRate duration').lean();
      if (!l) return { label: `Prêt ${entityId}`, amount: null };
      return {
        label:  `Prêt · ${l.amount?.toLocaleString('fr-FR')} TND · ${l.interestRate}% · ${l.duration} mois`,
        amount: l.amount,
      };
    }
    if (kind === 'user') {
      const u = await User.findById(entityId).select('name email role').lean();
      if (!u) return { label: `Utilisateur ${entityId}`, amount: null };
      return { label: `Utilisateur · ${u.name} (${u.email}) · ${u.role}`, amount: null };
    }
    if (kind === 'report') {
      const r = await Report.findById(entityId).select('title period version generatedByName').lean();
      if (!r) return { label: `Rapport ${entityId}`, amount: null };
      return { label: `Rapport · ${r.title} · v${r.version}${r.generatedByName ? ' · '+r.generatedByName : ''}`, amount: null };
    }
  } catch { /* ignore */ }
  return { label: `${kind} ${entityId}`, amount: null };
}

// POST /api/investigations/:id/link
exports.linkEntity = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (!canSee(req.user, inv)) return res.status(403).json({ message: 'Forbidden' });
    if (inv.status === 'closed') return res.status(400).json({ message: 'Investigation clôturée' });

    const { kind, entityId, reason } = req.body;
    if (!kind || !entityId) return res.status(400).json({ message: 'kind + entityId requis' });
    if (!['invoice', 'transaction', 'loan', 'asset', 'user', 'report'].includes(kind)) {
      return res.status(400).json({ message: 'kind invalide' });
    }

    // Prevent duplicates
    if (inv.linkedEntities.some((e) => e.kind === kind && String(e.entityId) === String(entityId))) {
      return res.status(400).json({ message: 'Déjà liée' });
    }

    const { label, amount } = await buildEntityLabel(kind, entityId);
    inv.linkedEntities.push({
      kind, entityId, label, amount,
      reason:  reason || '',
      addedBy: req.user.name,
    });
    inv.timeline.push({
      text:       `Entité liée : ${label}${reason ? ' — ' + reason : ''}`,
      severity:   'finding',
      authorId:   req.user._id,
      authorName: req.user.name,
    });
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/investigations/:id/link/:linkId
exports.unlinkEntity = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (!canSee(req.user, inv)) return res.status(403).json({ message: 'Forbidden' });
    if (inv.status === 'closed') return res.status(400).json({ message: 'Investigation clôturée' });

    const link = inv.linkedEntities.id(req.params.linkId);
    if (!link) return res.status(404).json({ message: 'Lien introuvable' });
    const removedLabel = link.label;
    link.deleteOne();
    inv.timeline.push({
      text:       `Entité retirée : ${removedLabel}`,
      severity:   'info',
      authorId:   req.user._id,
      authorName: req.user.name,
    });
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/investigations/:id/notes
exports.addNote = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (!canSee(req.user, inv)) return res.status(403).json({ message: 'Forbidden' });
    if (inv.status === 'closed') return res.status(400).json({ message: 'Investigation clôturée' });

    const { text, severity } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Texte requis' });

    inv.timeline.push({
      text:       text.trim(),
      severity:   severity || 'info',
      authorId:   req.user._id,
      authorName: req.user.name,
    });
    await inv.save();
    res.json(inv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/investigations/:id/close — sign & export a forensic PDF
exports.closeAndExport = async (req, res) => {
  try {
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (!canSee(req.user, inv)) return res.status(403).json({ message: 'Forbidden' });
    if (inv.status === 'closed') return res.status(400).json({ message: 'Déjà clôturée' });

    const { conclusion } = req.body;
    if (conclusion) inv.conclusion = conclusion;

    // Build HTML
    const html = buildInvestigationHTML(inv);

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const rawPdfBytes = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();
    let pdfBuffer = Buffer.from(rawPdfBytes);

    const filename = `investigation_${inv._id}_${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, filename);

    // Create Report doc first so we have an _id for the QR page
    const report = await Report.create({
      type:            'decision',
      title:           `Investigation — ${inv.title}`,
      period:          new Date().toISOString().slice(0, 7),
      language:        'fr',
      version:         1,
      filename,
      filePath,
      generatedBy:     'api',
      generatedByUser: req.user._id,
      generatedByName: inv.auditorName,
      status:          'generating',
    });

    const prehash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const { tsaToken, tsaStatus, tsaTimestamp, tsaIssuer } = await stampWithTSA(prehash);

    pdfBuffer = await appendVerificationPage(pdfBuffer, {
      reportId:    report._id,
      hash:        prehash,
      certCN:      inv.auditorName,
      signedAt:    new Date(),
      tsaStatus, tsaIssuer, tsaTimestamp,
    });

    const { hash, signature, certCN, certPem, signedAt } = signPDF(pdfBuffer);
    fs.writeFileSync(filePath, pdfBuffer);
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

    inv.status         = 'closed';
    inv.closedAt       = new Date();
    inv.exportReportId = report._id;
    inv.timeline.push({
      text:       `Investigation clôturée. Dossier exporté et signé (RSA-SHA256 + TSA).`,
      severity:   'finding',
      authorId:   req.user._id,
      authorName: req.user.name,
    });
    await inv.save();

    res.json({ investigation: inv, reportId: report._id, downloadUrl: `/api/export/pdf/${report._id}`, verifyUrl: `/verify/${report._id}` });
  } catch (err) {
    console.error('[INVESTIGATION EXPORT]', err);
    res.status(500).json({ message: err.message });
  }
};

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildInvestigationHTML(inv) {
  const now = new Date();
  const SEV_COLOR = { info: '#64748b', finding: '#b45309', non_compliance: '#b91c1c' };
  const SEV_LABEL = { info: 'Information', finding: 'Constatation', non_compliance: 'Non-conformité' };

  const timelineHtml = inv.timeline.map((n) => `
    <div class="note">
      <div class="note-meta">
        <span class="sev" style="background:${SEV_COLOR[n.severity] || '#64748b'}">${SEV_LABEL[n.severity] || n.severity}</span>
        <span class="note-author">${esc(n.authorName || '—')}</span>
        <span class="note-date">${new Date(n.createdAt).toLocaleString('fr-FR')}</span>
      </div>
      <div class="note-text">${esc(n.text)}</div>
    </div>
  `).join('');

  const entitiesHtml = inv.linkedEntities.length === 0
    ? '<tr><td colspan="3" class="muted">Aucune entité liée.</td></tr>'
    : inv.linkedEntities.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="kind-${e.kind}">${e.kind.toUpperCase()}</span></td>
        <td>
          <div class="entity-label">${esc(e.label)}</div>
          ${e.reason ? `<div class="entity-reason">${esc(e.reason)}</div>` : ''}
        </td>
      </tr>
    `).join('');

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><style>
  @page { size: A4; margin: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px 48px; color: #1f2937; }
  .cover-badge { display:inline-block; background:#7f1d1d; color:white; padding:4px 10px; border-radius: 999px; font-size: 9pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  h1 { color: #7f1d1d; font-size: 22pt; margin: 8px 0 4px; }
  .subject { color:#475569; font-size: 11pt; margin-bottom: 20px; font-style: italic; }
  .meta { display:grid; grid-template-columns: 120px 1fr; gap: 4px 14px; font-size: 10.5pt; background:#fef2f2; padding:14px 18px; border-radius: 8px; border-left: 4px solid #b91c1c; margin-bottom: 20px; }
  .meta .k { color:#64748b; font-weight: 600; }
  .meta .v { color:#0f172a; font-weight: 700; }
  h2 { color: #1e293b; font-size: 13pt; margin: 20px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  table { width:100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 14px; }
  th { text-align:left; padding: 6px 10px; background:#f1f5f9; color:#475569; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .kind-invoice, .kind-transaction, .kind-loan, .kind-asset, .kind-user, .kind-report { display:inline-block; padding:2px 8px; border-radius: 999px; font-size: 8pt; font-weight: 700; letter-spacing: 1px; }
  .kind-invoice     { background:#fef3c7; color:#854d0e; }
  .kind-transaction { background:#dbeafe; color:#1e40af; }
  .kind-loan        { background:#ede9fe; color:#5b21b6; }
  .kind-asset       { background:#fce7f3; color:#9d174d; }
  .kind-user        { background:#ffe4e6; color:#9f1239; }
  .kind-report      { background:#ccfbf1; color:#115e59; }
  .entity-label { font-weight: 600; color:#0f172a; }
  .entity-reason { color:#64748b; font-size: 9pt; margin-top: 2px; font-style: italic; }
  .note { padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
  .note-meta { display:flex; gap:8px; align-items:center; font-size: 9pt; color:#475569; margin-bottom: 4px; }
  .sev { color:#fff; padding:1px 8px; border-radius: 999px; font-size: 8pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .note-author { font-weight: 700; color:#0f172a; }
  .note-date { color:#94a3b8; }
  .note-text { font-size: 10.5pt; line-height: 1.5; color: #1f2937; }
  .conclusion { background:#fffbeb; border-left: 4px solid #f59e0b; padding:14px 18px; border-radius: 8px; margin-top: 12px; font-size: 11pt; white-space: pre-wrap; }
  .muted { color:#94a3b8; font-style: italic; text-align:center; }
  .footer { margin-top: 28px; font-size: 8.5pt; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px; }
</style></head>
<body>
  <span class="cover-badge">🔍 Dossier d'investigation</span>
  <h1>${esc(inv.title)}</h1>
  ${inv.subject ? `<div class="subject">${esc(inv.subject)}</div>` : ''}

  <div class="meta">
    <span class="k">Auditeur</span>          <span class="v">${esc(inv.auditorName)}</span>
    <span class="k">Ouverte le</span>        <span class="v">${new Date(inv.createdAt).toLocaleString('fr-FR')}</span>
    <span class="k">Clôturée le</span>       <span class="v">${now.toLocaleString('fr-FR')}</span>
    <span class="k">Référence</span>         <span class="v">${inv._id}</span>
    <span class="k">Entités liées</span>     <span class="v">${inv.linkedEntities.length}</span>
    <span class="k">Notes timeline</span>    <span class="v">${inv.timeline.length}</span>
  </div>

  <h2>1. Entités sous investigation</h2>
  <table>
    <thead><tr><th style="width:28px">#</th><th style="width:100px">Type</th><th>Détail</th></tr></thead>
    <tbody>${entitiesHtml}</tbody>
  </table>

  <h2>2. Chronologie des observations</h2>
  ${inv.timeline.length === 0 ? '<p class="muted">Aucune note.</p>' : timelineHtml}

  <h2>3. Conclusion de l'auditeur</h2>
  <div class="conclusion">${esc(inv.conclusion || 'Aucune conclusion renseignée.')}</div>

  <div class="footer">
    Ce dossier est signé numériquement (RSA-SHA256) et horodaté via une autorité de confiance (RFC 3161, eIDAS).
    Toute modification post-signature sera détectée par la page publique de vérification.
  </div>
</body></html>`;
}
