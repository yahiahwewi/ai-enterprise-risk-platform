const EmailEvent = require('../models/EmailEvent');
const MailSettings = require('../models/MailSettings');
const { CATALOG, seedDefaults } = require('../services/emailEvents');
const { dispatchEvent, bustMailEnabledCache } = require('../services/eventDispatcher');

// GET /api/email-events — list grouped by category
exports.list = async (req, res) => {
  try {
    const events = await EmailEvent.find().sort({ category: 1, key: 1 }).lean();
    const grouped = events.reduce((acc, e) => {
      (acc[e.category] = acc[e.category] || []).push(e);
      return acc;
    }, {});
    res.json({ count: events.length, grouped, events });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PATCH /api/email-events/:key — update a single template / role mapping
exports.update = async (req, res) => {
  try {
    const allowed = [
      'active',
      'priority',
      'defaultRoles',
      'titleFr',
      'titleEn',
      'bodyFr',
      'bodyEn',
    ];
    const patch = {};
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
    patch.updatedBy = req.user?._id;
    const updated = await EmailEvent.findOneAndUpdate({ key: req.params.key }, patch, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: 'Event not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/email-events/reset — re-seed missing entries (idempotent)
exports.reset = async (req, res) => {
  try {
    const count = await seedDefaults();
    res.json({ message: `${count} event(s) seeded`, seeded: count });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/email-events/settings — global toggle state
exports.getSettings = async (req, res) => {
  try {
    const doc = await MailSettings.findOneAndUpdate(
      { _id: 'singleton' },
      { $setOnInsert: { enabled: true } },
      { upsert: true, new: true }
    );
    res.json({ enabled: !!doc.enabled, updatedAt: doc.updatedAt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PATCH /api/email-events/settings — flip the kill-switch
exports.updateSettings = async (req, res) => {
  try {
    const doc = await MailSettings.findOneAndUpdate(
      { _id: 'singleton' },
      { enabled: !!req.body.enabled, updatedBy: req.user?._id },
      { upsert: true, new: true }
    );
    bustMailEnabledCache();
    res.json({ enabled: !!doc.enabled });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/email-events/:key/test — send a test email to a chosen recipient
exports.testSend = async (req, res) => {
  try {
    const evt = await EmailEvent.findOne({ key: req.params.key });
    if (!evt) return res.status(404).json({ message: 'Event not found' });

    // Accept a custom recipient email (admin can send to anyone for QA);
    // fall back to the current user's address.
    const targetEmail = (req.body?.recipientEmail || req.user?.email || '').trim();
    if (!targetEmail || !/.+@.+\..+/.test(targetEmail)) {
      return res.status(400).json({ message: 'Adresse email destinataire invalide.' });
    }
    const targetName = req.body?.recipientName || targetEmail.split('@')[0];

    // Provide rich placeholder data so every {{token}} in the template renders
    const sample = {
      user: { name: req.user.name, email: req.user.email, role: req.user.role },
      actor: { name: req.user.name, email: req.user.email, role: req.user.role },
      recipient: { name: req.user.name },
      code: '478932',
      minutes: 15,
      reason: ' (Motif : exemple de raison)',
      invoice: { clientName: 'Client Démo SARL', amount: 12500, dueDate: '15/05/2026' },
      memo: { title: 'Mémo de démonstration', description: "Contenu du mémo critique d'exemple." },
      score: 78,
      topCause: 'Trésorerie',
      date: new Date().toLocaleDateString('fr-FR'),
      month: 'Avril 2026',
      hash: '0bf2a977dfc7ae83…',
      txCount: 14,
      income: 12500,
      expense: 8200,
      invCount: 3,
      trend: '+4 vs semaine précédente',
      actions: 'Relancer 3 factures, geler dépenses Marketing, ouvrir prêt court terme',
      topClients: 'Client A · Client B · Client C',
      amount: 13800,
      daysLeft: 3,
      type: 'Acompte provisionnel',
      daysOverdue: 32,
      permission: { label: 'Approuver factures > 10K', allowedRoles: 'owner, finance' },
    };

    // Override the user/recipient tokens with the test-target so the
    // rendered template addresses the chosen mailbox.
    sample.user = { name: targetName, email: targetEmail, role: req.user.role };
    sample.recipient = { name: targetName };

    await dispatchEvent(req.params.key, sample, {
      // Empty roles list + only the explicit recipient → only that address gets the email
      extraRecipients: [{ _id: 'test-' + Date.now(), email: targetEmail, name: targetName }],
      lang: req.body?.lang || 'fr',
      bypassMaster: true, // test sends always work, even when the master toggle is off
      testOnly: true, // skip role-based recipients — only the picked address
    });
    res.json({ message: `Test envoyé à ${targetEmail}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
