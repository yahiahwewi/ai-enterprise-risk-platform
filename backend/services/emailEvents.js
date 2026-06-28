/**
 * EmailEvent registry — canonical catalogue of every transactional email.
 *
 * Each entry pairs a Mustache-style copy block (titleFr/titleEn/bodyFr/bodyEn)
 * with visual metadata (theme, hero band, icon, key facts, CTA button) so the
 * dispatcher can produce a richly-themed HTML email per event type:
 *
 *   • auth     — formal navy, padlock iconography
 *   • danger   — red banner, siren icon (critical alerts)
 *   • reminder — amber/gold band, calendar icon (deadlines, overdue)
 *   • report   — editorial cream + gold (digests, monthly reports)
 *   • info     — clean navy (default informational notifications)
 *   • admin    — dark slate (admin / RBAC / security)
 *
 * The seedDefaults() helper upserts the catalogue at boot so theme metadata
 * stays in sync with the codebase even after schema changes, while
 * preserving any custom subject/body edits made by the admin.
 */
const EmailEvent = require('../models/EmailEvent');

const CATALOG = [
  // ────────────────────────────────────────────────────────────────────
  // AUTH
  // ────────────────────────────────────────────────────────────────────
  {
    key: 'auth.otp_sent',
    category: 'auth',
    priority: 'high',
    theme: 'auth',
    icon: 'pin',
    defaultRoles: [],
    titleFr: 'Tac-Tic ERM — Code de vérification : {{code}}',
    titleEn: 'Tac-Tic ERM — Verification code: {{code}}',
    heroFr: 'Vérifiez votre email',
    heroEn: 'Verify your email',
    bodyFr:
      "Bonjour {{user.name}},\n\nUtilisez le code ci-dessous pour valider votre adresse. Il expire dans {{minutes}} minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    bodyEn:
      "Hello {{user.name}},\n\nUse the code below to verify your email. It expires in {{minutes}} minutes.\n\nIf you didn't request this, simply ignore the message.",
    keyFacts: ['code', 'minutes'],
    descFr: "Code OTP envoyé à l'inscription.",
    descEn: 'OTP sent on signup.',
  },
  {
    key: 'auth.account_approved',
    category: 'auth',
    priority: 'high',
    theme: 'auth',
    icon: 'verified_user',
    defaultRoles: [],
    titleFr: 'Bienvenue sur Tac-Tic ERM — Votre compte est actif',
    titleEn: 'Welcome to Tac-Tic ERM — Your account is active',
    heroFr: 'Compte approuvé',
    heroEn: 'Account approved',
    bodyFr:
      "Bonjour {{user.name}},\n\nVotre compte ({{user.role}}) a été approuvé par l'administrateur. Vous pouvez désormais accéder à la plateforme et consulter votre tableau de bord.",
    bodyEn:
      'Hello {{user.name}},\n\nYour account ({{user.role}}) has been approved by the administrator. You can now sign in and access your dashboard.',
    ctaFr: 'Accéder à mon espace',
    ctaEn: 'Sign in',
    ctaPath: '/login',
    descFr: 'Confirmation envoyée après approbation admin.',
    descEn: 'Confirmation sent after admin approval.',
  },
  {
    key: 'auth.account_rejected',
    category: 'auth',
    priority: 'high',
    theme: 'admin',
    icon: 'block',
    defaultRoles: [],
    titleFr: "Tac-Tic ERM — Demande d'accès refusée",
    titleEn: 'Tac-Tic ERM — Access request denied',
    heroFr: 'Demande refusée',
    heroEn: 'Request denied',
    bodyFr:
      "Bonjour {{user.name}},\n\nVotre demande d'accès à Tac-Tic ERM n'a pas été approuvée.{{reason}}\n\nPour toute question, contactez l'administrateur de votre organisation.",
    bodyEn:
      "Hello {{user.name}},\n\nYour access request to Tac-Tic ERM has not been approved.{{reason}}\n\nFor any question, please contact your organisation's administrator.",
    descFr: 'Notification de refus avec motif optionnel.',
    descEn: 'Rejection notice with optional reason.',
  },
  {
    key: 'auth.signup_pending',
    category: 'auth',
    priority: 'medium',
    theme: 'admin',
    icon: 'how_to_reg',
    defaultRoles: ['admin'],
    titleFr: "Nouvelle demande d'accès : {{user.name}}",
    titleEn: 'New access request: {{user.name}}',
    heroFr: 'Demande à valider',
    heroEn: 'Pending approval',
    bodyFr:
      "Une nouvelle demande d'accès attend votre validation. L'utilisateur a vérifié son adresse email — il vous reste à approuver ou refuser le compte.",
    bodyEn:
      'A new access request awaits your approval. The user verified their email — please approve or reject the account.',
    keyFacts: ['user.name', 'user.email', 'user.role'],
    ctaFr: 'Examiner la demande',
    ctaEn: 'Review request',
    ctaPath: '/users',
    descFr: "Notifie les administrateurs d'une inscription vérifiée.",
    descEn: 'Notifies admins of a verified pending signup.',
  },

  // ────────────────────────────────────────────────────────────────────
  // FINANCE / WORKFLOW
  // ────────────────────────────────────────────────────────────────────
  {
    key: 'invoice.approval_needed',
    category: 'finance',
    priority: 'high',
    theme: 'reminder',
    icon: 'fact_check',
    defaultRoles: ['owner', 'finance'],
    titleFr: 'Approbation requise — Facture {{invoice.amount}} TND ({{invoice.clientName}})',
    titleEn: 'Approval required — Invoice {{invoice.amount}} TND ({{invoice.clientName}})',
    heroFr: 'Approbation requise',
    heroEn: 'Approval required',
    bodyFr:
      "Une facture vient d'être créée et nécessite votre validation avant émission. Examinez les conditions ci-dessous puis approuvez ou rejetez la pièce dans le module dédié.",
    bodyEn:
      'A new invoice has been created and requires your approval before issuance. Review the details below then approve or reject from the dedicated module.',
    keyFacts: ['invoice.clientName', 'invoice.amount', 'invoice.dueDate', 'actor.name'],
    ctaFr: 'Approuver / Rejeter',
    ctaEn: 'Approve / Reject',
    ctaPath: '/approvals',
    descFr: "Notifie les approbateurs lorsqu'une facture > seuil est créée.",
    descEn: 'Notifies approvers when an above-threshold invoice is created.',
  },
  {
    key: 'invoice.approved',
    category: 'finance',
    priority: 'medium',
    theme: 'info',
    icon: 'check_circle',
    defaultRoles: [],
    titleFr: 'Facture approuvée — {{invoice.clientName}}',
    titleEn: 'Invoice approved — {{invoice.clientName}}',
    heroFr: 'Facture validée',
    heroEn: 'Invoice approved',
    bodyFr:
      'Bonne nouvelle : votre facture pour {{invoice.clientName}} a été approuvée par {{actor.name}}. Elle peut désormais être émise au client.',
    bodyEn:
      'Good news — your invoice for {{invoice.clientName}} has been approved by {{actor.name}}. It can now be issued to the client.',
    keyFacts: ['invoice.clientName', 'invoice.amount', 'actor.name'],
    ctaFr: 'Voir la facture',
    ctaEn: 'View invoice',
    ctaPath: '/invoices',
    descFr: 'Confirme au créateur que sa facture est approuvée.',
    descEn: 'Confirms to the creator that their invoice is approved.',
  },
  {
    key: 'invoice.rejected',
    category: 'finance',
    priority: 'high',
    theme: 'danger',
    icon: 'cancel',
    defaultRoles: [],
    titleFr: 'Facture rejetée — {{invoice.clientName}}',
    titleEn: 'Invoice rejected — {{invoice.clientName}}',
    heroFr: 'Facture rejetée',
    heroEn: 'Invoice rejected',
    bodyFr:
      'Votre facture pour {{invoice.clientName}} a été rejetée par {{actor.name}}.\n\nMotif : {{reason}}\n\nCorrigez les éléments signalés et resoumettez-la pour validation.',
    bodyEn:
      'Your invoice for {{invoice.clientName}} has been rejected by {{actor.name}}.\n\nReason: {{reason}}\n\nAdjust the flagged items and resubmit for approval.',
    keyFacts: ['invoice.clientName', 'invoice.amount', 'actor.name'],
    ctaFr: 'Modifier la facture',
    ctaEn: 'Edit invoice',
    ctaPath: '/invoices',
    descFr: "Notifie le créateur d'un rejet avec motif.",
    descEn: 'Notifies the creator of a rejection with reason.',
  },
  {
    key: 'invoice.overdue',
    category: 'finance',
    priority: 'medium',
    theme: 'reminder',
    icon: 'event_busy',
    defaultRoles: ['owner', 'accountant'],
    titleFr: 'Facture en retard — {{invoice.clientName}} · {{daysOverdue}} jours',
    titleEn: 'Overdue invoice — {{invoice.clientName}} · {{daysOverdue}} days',
    heroFr: 'Facture en retard',
    heroEn: 'Invoice overdue',
    bodyFr:
      'La facture pour {{invoice.clientName}} dépasse son échéance. Une relance client est recommandée pour préserver votre cycle de trésorerie.',
    bodyEn:
      'The invoice for {{invoice.clientName}} is past due. A client reminder is recommended to protect your cash flow.',
    keyFacts: ['invoice.clientName', 'invoice.amount', 'invoice.dueDate', 'daysOverdue'],
    ctaFr: 'Voir les factures',
    ctaEn: 'View invoices',
    ctaPath: '/invoices',
    descFr: 'Relance automatique J+15 / J+30 / J+60.',
    descEn: 'Automated reminder at D+15 / D+30 / D+60.',
  },

  // ────────────────────────────────────────────────────────────────────
  // RISK & AI
  // ────────────────────────────────────────────────────────────────────
  {
    key: 'risk.threshold_high',
    category: 'risk',
    priority: 'high',
    theme: 'reminder',
    icon: 'trending_up',
    defaultRoles: ['owner', 'analyst'],
    titleFr: 'Risque élevé détecté — Score {{score}}/100',
    titleEn: 'High risk detected — Score {{score}}/100',
    heroFr: 'Vigilance accrue',
    heroEn: 'Heightened vigilance',
    bodyFr:
      "Le score de risque global vient de franchir le seuil élevé. Nous vous recommandons de consulter l'analyse complète et d'examiner les facteurs contributifs avant la fin de la semaine.",
    bodyEn:
      'The global risk score has just crossed the high threshold. We recommend reviewing the full analysis and examining contributing drivers before the end of the week.',
    keyFacts: ['score', 'topCause'],
    ctaFr: "Ouvrir l'analyse",
    ctaEn: 'Open analysis',
    ctaPath: '/risk-report',
    descFr: 'Déclenché lorsque le score franchit 50.',
    descEn: 'Triggered when score crosses 50.',
  },
  {
    key: 'risk.threshold_critical',
    category: 'risk',
    priority: 'critical',
    theme: 'danger',
    icon: 'crisis_alert',
    defaultRoles: ['owner', 'analyst', 'finance'],
    titleFr: 'Alerte critique — Score de risque {{score}}/100 — Action immédiate',
    titleEn: 'Critical alert — Risk score {{score}}/100 — Immediate action',
    heroFr: 'Niveau critique atteint',
    heroEn: 'Critical level reached',
    bodyFr:
      "Notification de niveau critique adressée à l'équipe dirigeante.\n\nLe score de risque global vient de franchir le seuil critique défini par la politique interne. Cette situation requiert une intervention immédiate du Directeur, du Directeur Financier et de l'Analyste des risques.\n\nLes actions suivantes doivent être engagées sans délai :\n\n• Convoquer une cellule de crise dans les 24 heures\n• Geler toute décision d'engagement non essentielle\n• Préparer un plan de redressement à 30 jours documenté\n• Notifier le commissaire aux comptes si la dégradation persiste\n\nLes éléments d'analyse complets, les causes racines et les recommandations stratégiques sont disponibles dans le module dédié. Cette alerte est consignée au journal d'audit de la plateforme.",
    bodyEn:
      "Critical-level notification addressed to the executive team.\n\nThe global risk score has just crossed the critical threshold defined by internal policy. This situation requires immediate intervention from the Owner, Finance Manager and Risk Analyst.\n\nThe following actions must be initiated without delay:\n\n• Convene a crisis committee within 24 hours\n• Freeze any non-essential commitments\n• Prepare a documented 30-day recovery plan\n• Notify the statutory auditor if the deterioration persists\n\nThe full analysis, root causes and strategic recommendations are available in the dedicated module. This alert is recorded in the platform's audit log.",
    keyFacts: ['score', 'topCause'],
    ctaFr: "Ouvrir l'analyse de crise",
    ctaEn: 'Open crisis analysis',
    ctaPath: '/risk-report',
    descFr: 'Déclenché lorsque le score franchit 75.',
    descEn: 'Triggered when score crosses 75.',
  },
  {
    key: 'risk.memo_critical',
    category: 'risk',
    priority: 'critical',
    theme: 'danger',
    icon: 'flag',
    defaultRoles: ['owner'],
    titleFr: 'Mémo de risque critique — Accusé de réception requis',
    titleEn: 'Critical risk memo — Acknowledgement required',
    heroFr: "Escalade de l'analyste des risques",
    heroEn: 'Risk analyst escalation',
    bodyFr:
      "Notification d'escalade émise par l'Analyste des risques.\n\n{{actor.name}} a formellement signalé un risque de niveau critique nécessitant l'attention immédiate de la Direction. Conformément à la procédure interne d'escalade, votre accusé de réception est obligatoire.\n\nObservation transmise :\n\n« {{memo.description}} »\n\nMerci de :\n\n• Prendre connaissance du mémo dans son intégralité\n• Documenter votre décision dans le module Mémos de risque\n• Définir le responsable et l'échéance de la mesure corrective\n\nL'absence d'accusé de réception sous 24 heures déclenchera une seconde notification.",
    bodyEn:
      'Escalation notice issued by the Risk Analyst.\n\n{{actor.name}} has formally flagged a critical-level risk requiring immediate attention from Management. Per the internal escalation procedure, your acknowledgement is mandatory.\n\nObservation submitted:\n\n"{{memo.description}}"\n\nPlease:\n\n• Read the memo in full\n• Document your decision in the Risk Memos module\n• Define the owner and deadline of the corrective measure\n\nFailure to acknowledge within 24 hours will trigger a second notification.',
    keyFacts: ['memo.title', 'actor.name'],
    ctaFr: 'Lire et accuser réception',
    ctaEn: 'Read and acknowledge',
    ctaPath: '/risk-memos',
    descFr: "Notifie l'Owner d'un mémo critique de l'analyste.",
    descEn: 'Notifies Owner of a critical memo from the analyst.',
  },
  {
    key: 'risk.daily_digest',
    category: 'risk',
    priority: 'info',
    theme: 'report',
    icon: 'today',
    defaultRoles: ['owner'],
    titleFr: 'Tac-Tic ERM — Résumé du {{date}}',
    titleEn: 'Tac-Tic ERM — Daily summary {{date}}',
    heroFr: 'Édition quotidienne',
    heroEn: 'Daily edition',
    bodyFr:
      "Voici un aperçu de l'activité financière de la veille. Le score de risque a été recalculé sur les données les plus récentes.",
    bodyEn:
      "Here is a snapshot of yesterday's financial activity. The risk score has been recomputed on the latest data.",
    keyFacts: ['txCount', 'income', 'expense', 'score'],
    ctaFr: 'Ouvrir le tableau de bord',
    ctaEn: 'Open dashboard',
    ctaPath: '/dashboard',
    descFr: 'Bilan quotidien envoyé à 07h00.',
    descEn: 'Daily summary sent at 07:00.',
  },
  {
    key: 'risk.weekly_digest',
    category: 'risk',
    priority: 'info',
    theme: 'report',
    icon: 'insights',
    defaultRoles: ['owner', 'finance', 'analyst'],
    titleFr: 'Tac-Tic ERM — Bilan hebdomadaire',
    titleEn: 'Tac-Tic ERM — Weekly digest',
    heroFr: 'Synthèse hebdomadaire',
    heroEn: 'Weekly synthesis',
    bodyFr:
      'Synthèse stratégique de la semaine — score, tendance, top actions et clients à risque. Document destiné aux comités exécutifs et hebdomadaires.',
    bodyEn:
      'Strategic synthesis of the week — score, trend, top actions and risky clients. Designed for exec and weekly committees.',
    keyFacts: ['score', 'trend'],
    ctaFr: 'Voir le détail',
    ctaEn: 'View details',
    ctaPath: '/dashboard',
    descFr: 'Digest envoyé chaque lundi à 08h00.',
    descEn: 'Digest sent every Monday at 08:00.',
  },
  {
    key: 'report.monthly_ready',
    category: 'risk',
    priority: 'high',
    theme: 'report',
    icon: 'verified',
    defaultRoles: ['owner', 'finance', 'auditor'],
    titleFr: 'Rapport mensuel certifié — {{month}}',
    titleEn: 'Certified monthly report — {{month}}',
    heroFr: 'Rapport signé numériquement',
    heroEn: 'Digitally signed report',
    bodyFr:
      'Le rapport mensuel a été généré et signé numériquement (RSA-2048 + horodatage TSA RFC 3161, conforme eIDAS). Vous pouvez le télécharger, le partager ou le présenter en conseil — son intégrité est cryptographiquement vérifiable.',
    bodyEn:
      'The monthly report has been generated and digitally signed (RSA-2048 + RFC 3161 TSA timestamp, eIDAS-compliant). You can download, share or present it — its integrity is cryptographically verifiable.',
    keyFacts: ['month', 'hash'],
    ctaFr: 'Télécharger le rapport',
    ctaEn: 'Download report',
    ctaPath: '/reports',
    descFr: 'Notification automatique le 1er du mois à 08h00.',
    descEn: 'Automated notification on the 1st of each month at 08:00.',
  },

  // ────────────────────────────────────────────────────────────────────
  // COMPLIANCE / FISCAL (Tunisia)
  // ────────────────────────────────────────────────────────────────────
  {
    key: 'compliance.cnss_due',
    category: 'compliance',
    priority: 'high',
    theme: 'reminder',
    icon: 'event',
    defaultRoles: ['owner', 'accountant'],
    titleFr: 'CNSS · {{amount}} TND à régler le {{date}}',
    titleEn: 'CNSS · {{amount}} TND due on {{date}}',
    heroFr: 'Échéance CNSS',
    heroEn: 'CNSS deadline',
    bodyFr:
      'Rappel : la cotisation CNSS arrive à échéance dans {{daysLeft}} jours. Le calcul est basé sur 25,75 % de la masse salariale du mois écoulé.',
    bodyEn:
      "Reminder: the CNSS contribution falls due in {{daysLeft}} days. The calculation is based on 25.75 % of last month's payroll.",
    keyFacts: ['amount', 'date', 'daysLeft'],
    ctaFr: 'Voir le calendrier fiscal',
    ctaEn: 'View fiscal calendar',
    ctaPath: '/executive',
    descFr: "Rappel J-3 avant l'échéance CNSS.",
    descEn: 'D-3 reminder before CNSS deadline.',
  },
  {
    key: 'compliance.tva_due',
    category: 'compliance',
    priority: 'high',
    theme: 'reminder',
    icon: 'request_quote',
    defaultRoles: ['owner', 'accountant'],
    titleFr: 'TVA mensuelle · {{amount}} TND à régler le {{date}}',
    titleEn: 'Monthly VAT · {{amount}} TND due on {{date}}',
    heroFr: 'Échéance TVA',
    heroEn: 'VAT deadline',
    bodyFr:
      'La déclaration et le paiement de la TVA mensuelle arrivent à échéance dans {{daysLeft}} jours. Préparez la déclaration et provisionnez le montant.',
    bodyEn:
      'The monthly VAT return and payment fall due in {{daysLeft}} days. Prepare the return and provision the amount.',
    keyFacts: ['amount', 'date', 'daysLeft'],
    ctaFr: 'Voir le calendrier fiscal',
    ctaEn: 'View fiscal calendar',
    ctaPath: '/executive',
    descFr: "Rappel J-3 avant l'échéance TVA.",
    descEn: 'D-3 reminder before VAT deadline.',
  },
  {
    key: 'compliance.is_due',
    category: 'compliance',
    priority: 'high',
    theme: 'reminder',
    icon: 'gavel',
    defaultRoles: ['owner', 'finance'],
    titleFr: 'Impôt sur les Sociétés · {{amount}} TND à régler le {{date}}',
    titleEn: 'Corporate Tax · {{amount}} TND due on {{date}}',
    heroFr: 'Échéance fiscale IS',
    heroEn: 'Corporate tax deadline',
    bodyFr:
      "Échéance pour l'Impôt sur les Sociétés ({{type}}) dans {{daysLeft}} jours. Vérifiez l'estimation et préparez le règlement auprès de la recette des finances.",
    bodyEn:
      'Corporate tax deadline ({{type}}) in {{daysLeft}} days. Verify the estimate and prepare the payment with the tax office.',
    keyFacts: ['amount', 'date', 'daysLeft', 'type'],
    ctaFr: 'Voir le calendrier fiscal',
    ctaEn: 'View fiscal calendar',
    ctaPath: '/executive',
    descFr: "Rappel pour les acomptes provisionnels et l'IS annuel.",
    descEn: 'Reminder for provisional instalments and annual corporate tax.',
  },

  // ────────────────────────────────────────────────────────────────────
  // ADMIN / SECURITY
  // ────────────────────────────────────────────────────────────────────
  {
    key: 'admin.permission_changed',
    category: 'admin',
    priority: 'medium',
    theme: 'admin',
    icon: 'admin_panel_settings',
    defaultRoles: ['admin', 'owner'],
    titleFr: 'Permission modifiée : {{permission.label}}',
    titleEn: 'Permission updated: {{permission.label}}',
    heroFr: 'Configuration RBAC',
    heroEn: 'RBAC configuration',
    bodyFr:
      '{{actor.name}} a modifié la matrice de permissions. Vérifiez que le nouveau périmètre correspond aux règles internes.',
    bodyEn:
      '{{actor.name}} updated the permission matrix. Verify the new scope matches internal policies.',
    keyFacts: ['permission.label', 'permission.allowedRoles', 'actor.name'],
    ctaFr: 'Voir les permissions',
    ctaEn: 'View permissions',
    ctaPath: '/permissions',
    descFr: 'Trace les changements de RBAC.',
    descEn: 'Tracks RBAC changes.',
  },
];

// Theme→accent map (kept here so admin can preview without DB lookup)
const THEMES = {
  auth: { label: 'Authentification', accent: '#002b4c', bg: '#eef3f8' },
  danger: { label: 'Alerte critique', accent: '#c8102e', bg: '#fdecee' },
  reminder: { label: 'Rappel', accent: '#b8860b', bg: '#fbf4e1' },
  report: { label: 'Rapport éditorial', accent: '#0d7a4a', bg: '#eaf6f0' },
  info: { label: 'Notification', accent: '#1f6feb', bg: '#eaf2ff' },
  admin: { label: 'Administration', accent: '#1f2937', bg: '#eef0f2' },
};

async function seedDefaults() {
  let inserted = 0;
  let updatedMeta = 0;
  for (const tpl of CATALOG) {
    const existing = await EmailEvent.findOne({ key: tpl.key });
    if (!existing) {
      await EmailEvent.create(tpl);
      inserted += 1;
      continue;
    }
    // Force-overwrite the entire template (copy + metadata) so the
    // refreshed catalogue reaches production. Admin edits made via the
    // /email-config UI are lost on this pass; admins should re-apply them
    // after deploys (acceptable trade-off vs. drifting templates).
    await EmailEvent.updateOne({ key: tpl.key }, { $set: tpl });
    updatedMeta += 1;
  }
  if (inserted) console.log(`[email-events] seeded ${inserted} new event(s)`);
  if (updatedMeta) console.log(`[email-events] synced metadata on ${updatedMeta} event(s)`);
  return inserted;
}

module.exports = { CATALOG, THEMES, seedDefaults };
