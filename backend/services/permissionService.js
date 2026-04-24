/**
 * permissionService.js
 * Central source of truth for dynamic RBAC.
 * - Default permission catalog is seeded into the DB at boot.
 * - Runtime check: `can(user, key)` resolves against the current DB state.
 */
const Permission = require('../models/Permission');

const ROLES = ['admin', 'owner', 'accountant', 'finance', 'analyst', 'auditor'];

// ─── Default permission catalog ─────────────────────────────────────────
// Edit this list to add/remove permissions; the seed will upsert by `key`.
const DEFAULTS = [
  // ─── Finances — Factures ────────────────────────────────────────────
  { key: 'invoice.create',   module: 'Finances — Factures', label: 'Créer une facture',         labelEn: 'Create invoice',        allowedRoles: ['accountant', 'owner'] },
  { key: 'invoice.update',   module: 'Finances — Factures', label: 'Modifier une facture',      labelEn: 'Update invoice',        allowedRoles: ['accountant', 'owner'] },
  { key: 'invoice.delete',   module: 'Finances — Factures', label: 'Supprimer une facture',     labelEn: 'Delete invoice',        allowedRoles: ['accountant', 'owner'] },
  { key: 'invoice.view',     module: 'Finances — Factures', label: 'Consulter les factures',    labelEn: 'View invoices',         allowedRoles: ['admin', 'owner', 'accountant', 'finance', 'auditor'] },
  { key: 'invoice.integrity',module: 'Finances — Factures', label: 'Audit d\'intégrité SHA-256',labelEn: 'SHA-256 integrity audit',allowedRoles: ['accountant', 'owner', 'auditor'] },
  { key: 'invoice.import_ai',module: 'Finances — Factures', label: 'Import facture via IA (OCR)',labelEn: 'AI invoice OCR import', allowedRoles: ['accountant', 'owner', 'admin'] },

  // ─── Finances — Transactions ────────────────────────────────────────
  { key: 'transaction.create',module: 'Finances — Transactions', label: 'Créer une transaction', labelEn: 'Create transaction', allowedRoles: ['accountant', 'owner'] },
  { key: 'transaction.update',module: 'Finances — Transactions', label: 'Modifier une transaction', labelEn: 'Update transaction', allowedRoles: ['accountant', 'owner'] },
  { key: 'transaction.delete',module: 'Finances — Transactions', label: 'Supprimer une transaction', labelEn: 'Delete transaction', allowedRoles: ['accountant', 'owner'] },
  { key: 'transaction.view',  module: 'Finances — Transactions', label: 'Consulter les transactions', labelEn: 'View transactions', allowedRoles: ['admin', 'owner', 'accountant', 'finance', 'auditor'] },

  // ─── Finances — Prêts ───────────────────────────────────────────────
  { key: 'loan.create',  module: 'Finances — Prêts', label: 'Créer un prêt',     labelEn: 'Create loan',    allowedRoles: ['finance', 'owner'] },
  { key: 'loan.update',  module: 'Finances — Prêts', label: 'Modifier un prêt',  labelEn: 'Update loan',    allowedRoles: ['finance', 'owner'] },
  { key: 'loan.delete',  module: 'Finances — Prêts', label: 'Supprimer un prêt', labelEn: 'Delete loan',    allowedRoles: ['finance', 'owner'] },
  { key: 'loan.view',    module: 'Finances — Prêts', label: 'Consulter les prêts', labelEn: 'View loans',   allowedRoles: ['admin', 'owner', 'finance', 'auditor'] },

  // ─── Finances — Actifs ──────────────────────────────────────────────
  { key: 'asset.create', module: 'Finances — Actifs', label: 'Créer un actif',     labelEn: 'Create asset',  allowedRoles: ['finance', 'owner'] },
  { key: 'asset.update', module: 'Finances — Actifs', label: 'Modifier un actif',  labelEn: 'Update asset',  allowedRoles: ['finance', 'owner'] },
  { key: 'asset.delete', module: 'Finances — Actifs', label: 'Supprimer un actif', labelEn: 'Delete asset',  allowedRoles: ['finance', 'owner'] },
  { key: 'asset.view',   module: 'Finances — Actifs', label: 'Consulter les actifs', labelEn: 'View assets', allowedRoles: ['admin', 'owner', 'finance', 'auditor'] },

  // ─── Approbations — Seuils ──────────────────────────────────────────
  { key: 'approval.invoice',    module: 'Approbations', label: 'Seuil d\'approbation — Factures', labelEn: 'Approval threshold — Invoices',
    category: 'approval', threshold: 10000, bypassRoles: ['owner'],
    description: 'Toute facture au-dessus de ce seuil nécessite une approbation (sauf bypass).' },
  { key: 'approval.loan',       module: 'Approbations', label: 'Seuil d\'approbation — Prêts', labelEn: 'Approval threshold — Loans',
    category: 'approval', threshold: 100000, bypassRoles: ['owner'],
    description: 'Tout prêt au-dessus de ce seuil nécessite une approbation.' },
  { key: 'approval.expense',    module: 'Approbations', label: 'Seuil d\'approbation — Dépenses', labelEn: 'Approval threshold — Expenses',
    category: 'approval', threshold: 5000, bypassRoles: ['owner'],
    description: 'Toute dépense au-dessus de ce seuil déclenche une notification/approbation.' },
  { key: 'approval.approve',    module: 'Approbations', label: 'Qui peut approuver une demande', labelEn: 'Who can approve requests',
    allowedRoles: ['owner', 'admin'] },
  { key: 'approval.reject',     module: 'Approbations', label: 'Qui peut rejeter une demande', labelEn: 'Who can reject requests',
    allowedRoles: ['owner', 'admin'] },

  // ─── IA & Analyse ───────────────────────────────────────────────────
  { key: 'ai.risk_report',   module: 'Intelligence Artificielle', label: 'Déclencher le scoring IA',      labelEn: 'Trigger AI scoring',     allowedRoles: ['owner', 'analyst'] },
  { key: 'ai.final_decision',module: 'Intelligence Artificielle', label: 'Consulter la décision IA',      labelEn: 'View AI decision',       allowedRoles: ['owner', 'analyst'] },
  { key: 'ai.copilot',       module: 'Intelligence Artificielle', label: 'Utiliser le copilot IA',        labelEn: 'Use AI copilot',         allowedRoles: ['owner'] },
  { key: 'ai.simulate',      module: 'Intelligence Artificielle', label: 'Lancer une simulation',         labelEn: 'Run scenario simulation',allowedRoles: ['owner', 'analyst'] },
  { key: 'ai.forecast',      module: 'Intelligence Artificielle', label: 'Consulter les prévisions',      labelEn: 'View forecasts',         allowedRoles: ['owner', 'analyst', 'auditor'] },
  { key: 'ai.strategy',      module: 'Intelligence Artificielle', label: 'Accéder à la page Stratégie',   labelEn: 'Access Strategy page',   allowedRoles: ['owner'] },

  // ─── Risques & Mémos ────────────────────────────────────────────────
  { key: 'memo.create',      module: 'Risques & Mémos', label: 'Créer un mémo d\'analyse',     labelEn: 'Create analysis memo',    allowedRoles: ['analyst', 'owner'] },
  { key: 'memo.delete',      module: 'Risques & Mémos', label: 'Supprimer un mémo',            labelEn: 'Delete memo',             allowedRoles: ['analyst', 'owner', 'admin'] },
  { key: 'alert.escalate',   module: 'Risques & Mémos', label: 'Envoyer une alerte critique',  labelEn: 'Send critical alert',     allowedRoles: ['analyst', 'owner'] },
  { key: 'alert.acknowledge',module: 'Risques & Mémos', label: 'Acquitter une alerte critique',labelEn: 'Acknowledge critical alert',allowedRoles: ['owner', 'admin'] },

  // ─── Investigations ─────────────────────────────────────────────────
  { key: 'investigation.create',  module: 'Investigations', label: 'Ouvrir une investigation',      labelEn: 'Open investigation',   allowedRoles: ['auditor', 'owner', 'admin'] },
  { key: 'investigation.link',    module: 'Investigations', label: 'Rattacher des entités',         labelEn: 'Link entities',        allowedRoles: ['auditor', 'owner', 'admin'] },
  { key: 'investigation.note',    module: 'Investigations', label: 'Ajouter une note à la timeline',labelEn: 'Add timeline note',   allowedRoles: ['auditor', 'owner', 'admin'] },
  { key: 'investigation.close',   module: 'Investigations', label: 'Clôturer & signer le dossier',  labelEn: 'Close & sign dossier', allowedRoles: ['auditor', 'admin'] },
  { key: 'investigation.delete',  module: 'Investigations', label: 'Supprimer une investigation',   labelEn: 'Delete investigation', allowedRoles: ['auditor', 'admin'] },

  // ─── Certification & Rapports ───────────────────────────────────────
  { key: 'report.generate',  module: 'Certification & Rapports', label: 'Générer un rapport certifié',   labelEn: 'Generate certified report', allowedRoles: ['owner', 'admin'] },
  { key: 'report.download',  module: 'Certification & Rapports', label: 'Télécharger un rapport',        labelEn: 'Download a report',         allowedRoles: ['owner', 'admin', 'auditor'] },
  { key: 'report.delete',    module: 'Certification & Rapports', label: 'Supprimer un rapport',          labelEn: 'Delete a report',           allowedRoles: ['owner', 'admin'] },
  { key: 'report.check',     module: 'Certification & Rapports', label: 'Vérifier un rapport',           labelEn: 'Check a report',            allowedRoles: ['owner', 'admin', 'auditor'] },
  { key: 'activity.view',    module: 'Certification & Rapports', label: 'Consulter le journal d\'audit', labelEn: 'View activity log',         allowedRoles: ['owner', 'admin', 'auditor'] },

  // ─── Administration ─────────────────────────────────────────────────
  { key: 'user.approve',     module: 'Administration', label: 'Approuver les demandes d\'inscription', labelEn: 'Approve user signups',     allowedRoles: ['admin'] },
  { key: 'user.invite',      module: 'Administration', label: 'Inviter un membre d\'équipe',           labelEn: 'Invite a team member',     allowedRoles: ['owner', 'admin'] },
  { key: 'rule.configure',   module: 'Administration', label: 'Configurer les règles métier',           labelEn: 'Configure business rules', allowedRoles: ['admin', 'owner'] },
  { key: 'preset.manage',    module: 'Administration', label: 'Gérer catégories & clients',             labelEn: 'Manage categories/clients',allowedRoles: ['admin'] },
  { key: 'permission.manage',module: 'Administration', label: 'Modifier les permissions',               labelEn: 'Edit permissions',         allowedRoles: ['admin', 'owner'] },
];

// ─── Seeder ────────────────────────────────────────────────────────────
async function seedDefaults({ force = false } = {}) {
  try {
    let created = 0, updated = 0;
    for (let i = 0; i < DEFAULTS.length; i++) {
      const def = { ...DEFAULTS[i], order: i };
      const existing = await Permission.findOne({ key: def.key });
      if (!existing) {
        await Permission.create(def);
        created += 1;
      } else if (force) {
        await Permission.updateOne({ key: def.key }, { $set: def });
        updated += 1;
      }
    }
    if (created || updated) {
      console.log(`[permissions] seeded (created=${created}, updated=${updated})`);
    }
  } catch (err) {
    console.error('[permissions] seed error', err.message);
  }
}

// ─── Runtime check ─────────────────────────────────────────────────────
async function can(userRole, permissionKey) {
  if (!userRole) return false;
  // Admin always wins unless permission explicitly excludes admin
  const perm = await Permission.findOne({ key: permissionKey }).lean();
  if (!perm) {
    // Unknown key → deny by default (safer)
    return false;
  }
  return (perm.allowedRoles || []).includes(userRole);
}

// Express middleware factory — drop-in replacement for the old `authorize`
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const ok = await can(req.user?.role, permissionKey);
      if (!ok) return res.status(403).json({ message: 'Permission refusée', key: permissionKey });
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}

module.exports = { seedDefaults, can, requirePermission, DEFAULTS, ROLES };
