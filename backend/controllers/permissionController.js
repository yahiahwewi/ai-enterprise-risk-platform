const Permission = require('../models/Permission');
const { seedDefaults, ROLES } = require('../services/permissionService');

// GET /api/permissions
exports.list = async (req, res) => {
  try {
    const perms = await Permission.find({}).sort({ order: 1, module: 1, label: 1 }).lean();
    // Group by module for UI convenience
    const byModule = {};
    perms.forEach((p) => {
      byModule[p.module] ||= [];
      byModule[p.module].push(p);
    });
    res.json({ roles: ROLES, permissions: perms, groups: byModule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/permissions/:key
exports.update = async (req, res) => {
  try {
    const { allowedRoles, bypassRoles, threshold } = req.body;
    const perm = await Permission.findOne({ key: req.params.key });
    if (!perm) return res.status(404).json({ message: 'Permission inconnue' });

    if (Array.isArray(allowedRoles)) {
      perm.allowedRoles = allowedRoles.filter((r) => ROLES.includes(r));
    }
    if (Array.isArray(bypassRoles)) {
      perm.bypassRoles = bypassRoles.filter((r) => ROLES.includes(r));
    }
    if (typeof threshold === 'number' && threshold >= 0) {
      perm.threshold = threshold;
    }
    await perm.save();
    res.json(perm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/permissions/reset
exports.reset = async (req, res) => {
  try {
    await seedDefaults({ force: true });
    res.json({ message: 'Permissions réinitialisées aux valeurs par défaut.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
