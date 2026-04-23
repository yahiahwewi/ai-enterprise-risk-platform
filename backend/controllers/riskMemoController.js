const RiskMemo = require('../models/RiskMemo');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');

// GET /api/risk-memos — latest memos (analyst sees own, owner/auditor/admin see all)
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'analyst') filter.authorId = req.user._id;
    const memos = await RiskMemo.find(filter).sort({ createdAt: -1 }).limit(20).lean();
    res.json(memos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/risk-memos/pending-alerts — owner/admin: critical, not yet acknowledged
exports.pendingAlerts = async (req, res) => {
  try {
    const memos = await RiskMemo.find({
      severity:     'critical',
      escalated:    true,
      acknowledged: false,
    }).sort({ createdAt: -1 }).limit(50).lean();
    res.json(memos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/risk-memos — create a new memo (analyst or owner)
//   If severity === 'critical' → automatically escalated to all Owners + Admins via notifications.
exports.create = async (req, res) => {
  try {
    const { severity, sections, snapshotScore, snapshotLevel } = req.body;

    const anyContent = Object.values(sections || {}).some((v) => (v || '').trim().length > 0);
    if (!anyContent) {
      return res.status(400).json({ message: 'Le mémo est vide. Remplissez au moins une section.' });
    }

    const isCritical = severity === 'critical';
    const memo = await RiskMemo.create({
      authorId:      req.user._id,
      authorName:    req.user.name,
      severity:      severity || 'info',
      sections:      sections || {},
      snapshotScore: typeof snapshotScore === 'number' ? snapshotScore : undefined,
      snapshotLevel: snapshotLevel || undefined,
      escalated:     isCritical,
      escalatedAt:   isCritical ? new Date() : undefined,
    });

    // ── Critical memos trigger an immediate Owner-targeted alert ──────────────
    let alertSent = false;
    if (isCritical) {
      const owners = await User.find({ role: { $in: ['owner', 'admin'] }, status: 'approved' }).select('_id');
      const excerpt = (sections?.observations || sections?.contexte || sections?.recommandations || '')
        .slice(0, 200);
      const title = `Alerte critique - ${req.user.name}`;
      const message = excerpt
        ? `L'analyste signale un risque critique : ${excerpt}${excerpt.length >= 200 ? '…' : ''}`
        : `L'analyste ${req.user.name} a signalé un risque critique. Ouvrez le mémo pour consulter le détail.`;

      await Promise.all(owners.map((u) => createNotification({
        userId:   u._id,
        type:     'analyst_alert',
        title,
        message,
        severity: 'critical',
        priority: 100, // max — always floats to the top of the bell
        group:    'ai_prediction',
        metadata: { memoId: memo._id, authorId: req.user._id, authorName: req.user.name, snapshotScore },
      })));
      alertSent = owners.length > 0;
    }

    res.status(201).json({ memo, alertSent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/risk-memos/:id/acknowledge — owner or admin acknowledges a critical alert
exports.acknowledge = async (req, res) => {
  try {
    const memo = await RiskMemo.findById(req.params.id);
    if (!memo) return res.status(404).json({ message: 'Mémo introuvable' });
    if (memo.severity !== 'critical' || !memo.escalated) {
      return res.status(400).json({ message: 'Ce mémo n\'est pas en attente d\'acquittement.' });
    }
    if (memo.acknowledged) {
      return res.json({ memo, alreadyAcknowledged: true });
    }

    memo.acknowledged       = true;
    memo.acknowledgedAt     = new Date();
    memo.acknowledgedBy     = req.user._id;
    memo.acknowledgedByName = req.user.name;
    await memo.save();

    // Mark the matching analyst_alert notifications as read
    await Notification.updateMany(
      { type: 'analyst_alert', 'metadata.memoId': memo._id, read: false },
      { $set: { read: true } }
    );

    // Notify the analyst that their alert was acknowledged
    await createNotification({
      userId:   memo.authorId,
      type:     'alert_acknowledged',
      title:    'Alerte acquittée',
      message:  `${req.user.name} a acquitté votre alerte critique du ${new Date(memo.escalatedAt).toLocaleDateString('fr-FR')}.`,
      severity: 'info',
      metadata: { memoId: memo._id },
    });

    res.json({ memo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/risk-memos/:id — author or admin/owner
exports.remove = async (req, res) => {
  try {
    const memo = await RiskMemo.findById(req.params.id);
    if (!memo) return res.status(404).json({ message: 'Mémo introuvable' });

    const isAuthor = String(memo.authorId) === String(req.user._id);
    const isPrivileged = ['owner', 'admin'].includes(req.user.role);
    if (!isAuthor && !isPrivileged) {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    await memo.deleteOne();
    res.json({ message: 'Mémo supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
