/**
 * Central dispatcher for event-driven email notifications.
 *
 *   await dispatchEvent('invoice.approval_needed', { invoice, actor })
 *
 * Flow:
 *   1. Look up the EmailEvent by key (active flag + custom roles/templates)
 *   2. Resolve recipients = users matching defaultRoles + extra recipients
 *   3. Render Mustache-style {{tokens}} in subject/body
 *   4. Fire-and-forget mailer.send()
 *
 * The dispatcher never throws — failures are logged so business flows
 * (createInvoice, etc.) are never blocked by SMTP issues.
 */
const EmailEvent = require('../models/EmailEvent');
const MailSettings = require('../models/MailSettings');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Cache the master enable flag for 30 s so we don't hit Mongo on every send.
let _masterCache = { value: true, ts: 0 };
async function isMailEnabled() {
  const now = Date.now();
  if (now - _masterCache.ts < 30000) return _masterCache.value;
  try {
    const doc = await MailSettings.findOneAndUpdate(
      { _id: 'singleton' },
      { $setOnInsert: { enabled: true } },
      { upsert: true, new: true }
    );
    _masterCache = { value: !!doc.enabled, ts: now };
    return _masterCache.value;
  } catch {
    return true; // fail open — never block on a settings read failure
  }
}
function bustMailEnabledCache() {
  _masterCache.ts = 0;
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const APP_NAME = process.env.APP_NAME || 'Tac-Tic ERM';
const MAIL_FROM = process.env.MAIL_FROM || `${APP_NAME} <no-reply@tactic-erm.local>`;

let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = {
      sendMail: async (opts) => {
        console.log(`\n───── EVENT EMAIL (dev fallback) ─────`);
        console.log('To:      ', opts.to);
        console.log('Subject: ', opts.subject);
        console.log('Body:    ', String(opts.text || '').slice(0, 400));
        console.log('───────────────────────────────────────\n');
        return { messageId: 'dev-' + Date.now() };
      },
    };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// ── Mustache-lite ─────────────────────────────────────────────────────
function get(obj, path) {
  return path.split('.').reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}

function render(template, data) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = get(data, key);
    if (v === undefined || v === null) return '';
    if (v instanceof Date) return v.toLocaleDateString('fr-FR');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

// ── Themed HTML renderer ──────────────────────────────────────────────
// Six visual themes — each picks its hero color, key-fact tint, badge text:
//   auth (navy)  · danger (red)  · reminder (gold)
//   report (forest)  · info (blue)  · admin (slate)
// Theme metadata lives on the EmailEvent document so admins can change it
// without code edits.
const THEMES = {
  auth: { accent: '#002b4c', tint: '#eef3f8', badgeFr: 'Sécurité', badgeEn: 'Security' },
  danger: { accent: '#c8102e', tint: '#fdecee', badgeFr: 'Alerte', badgeEn: 'Alert' },
  reminder: { accent: '#b8860b', tint: '#fbf4e1', badgeFr: 'Rappel', badgeEn: 'Reminder' },
  report: { accent: '#0d7a4a', tint: '#eaf6f0', badgeFr: 'Rapport', badgeEn: 'Report' },
  info: { accent: '#1f6feb', tint: '#eaf2ff', badgeFr: 'Information', badgeEn: 'Info' },
  admin: { accent: '#1f2937', tint: '#eef0f2', badgeFr: 'Administration', badgeEn: 'Admin' },
};

function pickTheme(evt) {
  if (evt?.theme && THEMES[evt.theme]) return evt.theme;
  if (evt?.priority === 'critical') return 'danger';
  if (evt?.category === 'compliance' || evt?.category === 'finance') return 'reminder';
  if (evt?.category === 'risk') return 'report';
  if (evt?.category === 'admin' || evt?.category === 'auth') return 'auth';
  return 'info';
}

// Friendly labels for the key-fact strip
const FACT_LABELS = {
  fr: {
    code: 'Code',
    minutes: 'Validité',
    score: 'Score',
    topCause: 'Cause principale',
    'invoice.amount': 'Montant',
    'invoice.dueDate': 'Échéance',
    'invoice.clientName': 'Client',
    'memo.title': 'Mémo',
    'actor.name': 'Émis par',
    'user.name': 'Utilisateur',
    'user.email': 'Email',
    'user.role': 'Rôle',
    daysOverdue: 'Retard (jours)',
    daysLeft: 'Jours restants',
    amount: 'Montant',
    date: 'Date',
    type: 'Type',
    txCount: 'Transactions',
    income: 'Revenus',
    expense: 'Dépenses',
    invCount: 'Factures',
    month: 'Période',
    hash: 'Empreinte SHA-256',
    trend: 'Tendance',
    'permission.label': 'Permission',
    'permission.allowedRoles': 'Rôles autorisés',
  },
  en: {
    code: 'Code',
    minutes: 'Valid for',
    score: 'Score',
    topCause: 'Top driver',
    'invoice.amount': 'Amount',
    'invoice.dueDate': 'Due date',
    'invoice.clientName': 'Client',
    'memo.title': 'Memo',
    'actor.name': 'Issued by',
    'user.name': 'User',
    'user.email': 'Email',
    'user.role': 'Role',
    daysOverdue: 'Days overdue',
    daysLeft: 'Days left',
    amount: 'Amount',
    date: 'Date',
    type: 'Type',
    txCount: 'Transactions',
    income: 'Income',
    expense: 'Expenses',
    invCount: 'Invoices',
    month: 'Period',
    hash: 'SHA-256',
    trend: 'Trend',
    'permission.label': 'Permission',
    'permission.allowedRoles': 'Allowed roles',
  },
};

function fmtFactValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v instanceof Date) return v.toLocaleDateString('fr-FR');
  if (typeof v === 'number') return v.toLocaleString('fr-FR');
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Convert plain-text body (with \n) to safe HTML paragraphs preserving bold cues.
function bodyToHtml(text) {
  const safe = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Auto-link URLs (rare — tokens like {{appUrl}} already rendered)
  const linked = safe.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:inherit;text-decoration:underline;">$1</a>'
  );
  return linked
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.65;color:#374151;">${p.replace(/\n/g, '<br>')}</p>`
    )
    .join('');
}

// Compute a status-reactive accent override based on payload data.
// Some events (overdue invoice, score thresholds, fiscal countdown) deserve
// stronger reds when their numbers cross severity boundaries.
function statusOverride(event, ctx, baseAccent) {
  const score = Number(get(ctx, 'score'));
  if (Number.isFinite(score)) {
    if (score >= 75)
      return { accent: '#a4071c', tint: '#fdecee', statusFr: 'Critique', statusEn: 'Critical' };
    if (score >= 50)
      return { accent: '#d97706', tint: '#fff4e6', statusFr: 'Élevé', statusEn: 'High' };
    if (score >= 25)
      return { accent: '#b8860b', tint: '#fbf4e1', statusFr: 'Modéré', statusEn: 'Moderate' };
  }
  const days = Number(get(ctx, 'daysOverdue'));
  if (Number.isFinite(days) && days > 0) {
    if (days >= 60)
      return {
        accent: '#a4071c',
        tint: '#fdecee',
        statusFr: 'Litige potentiel',
        statusEn: 'Potential dispute',
      };
    if (days >= 30)
      return {
        accent: '#c8102e',
        tint: '#fdecee',
        statusFr: 'Retard sévère',
        statusEn: 'Severe delay',
      };
    if (days >= 15)
      return { accent: '#d97706', tint: '#fff4e6', statusFr: 'Retard', statusEn: 'Late' };
  }
  const dl = Number(get(ctx, 'daysLeft'));
  if (Number.isFinite(dl)) {
    if (dl <= 1)
      return {
        accent: '#a4071c',
        tint: '#fdecee',
        statusFr: 'Échéance imminente',
        statusEn: 'Imminent deadline',
      };
    if (dl <= 3)
      return {
        accent: '#c8102e',
        tint: '#fdecee',
        statusFr: 'Échéance proche',
        statusEn: 'Deadline soon',
      };
    if (dl <= 7)
      return {
        accent: '#d97706',
        tint: '#fff4e6',
        statusFr: 'À planifier',
        statusEn: 'Plan ahead',
      };
  }
  return null;
}

function htmlWrap({ event, lang, subject, body, ctx }) {
  const themeKey = pickTheme(event);
  const theme = { ...(THEMES[themeKey] || THEMES.info) };
  const isFr = lang === 'fr';
  const isCritical = event?.priority === 'critical';

  // Status override based on payload (reds intensify with severity)
  const override = statusOverride(event, ctx, theme.accent);
  if (override) {
    theme.accent = override.accent;
    theme.tint = override.tint;
  }
  // Critical events use an oxblood accent regardless of payload — institutional gravity.
  if (isCritical) {
    theme.accent = '#5a0511';
    theme.tint = '#fdecee';
  }
  const statusLabel = override ? (isFr ? override.statusFr : override.statusEn) : '';

  // Hero band
  const heroTitle = (isFr ? event?.heroFr : event?.heroEn) || subject;
  const icon = event?.icon || 'mail';

  // Key facts strip
  const factsHtml = (event?.keyFacts || [])
    .map((path) => {
      const v = get(ctx, path);
      if (v === null || v === undefined || v === '') return '';
      const label = FACT_LABELS[isFr ? 'fr' : 'en'][path] || path;
      return `
      <td style="padding:14px 18px;background:${theme.tint};border:1px solid #e8e0d0;border-radius:6px;vertical-align:top;min-width:120px;">
        <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:6px;">${label}</div>
        <div style="font-size:15px;color:#0b1f33;font-weight:700;font-family:Georgia,'Times New Roman',serif;">${fmtFactValue(v)}</div>
      </td>`;
    })
    .filter(Boolean)
    .join('<td style="width:8px;"></td>');

  const factsBlock = factsHtml
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:separate;border-spacing:0;"><tr>${factsHtml}</tr></table>`
    : '';

  // CTA button
  const ctaText = isFr ? event?.ctaFr : event?.ctaEn;
  const ctaUrl = event?.ctaPath
    ? (process.env.APP_URL || 'http://localhost:3000') + event.ctaPath
    : '';
  const ctaBlock =
    ctaText && ctaUrl
      ? `
    <div style="margin:18px 0 6px;">
      <a href="${ctaUrl}" style="display:inline-block;background:${theme.accent};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:6px;letter-spacing:.3px;">
        ${ctaText} →
      </a>
    </div>`
      : '';

  // Priority pill
  const priorityLabel = isFr
    ? { critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse', info: 'Info' }
    : { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };
  const pill = event?.priority
    ? `<span style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:3px 9px;border-radius:999px;">${priorityLabel[event.priority] || event.priority}</span>`
    : '';

  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f2ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0b1f33;">
  <!-- Preheader (hidden) -->
  <div style="display:none;font-size:1px;color:#f6f2ea;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${subject}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ea;padding:36px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 6px 20px rgba(11,31,51,0.08);">

        <!-- Brand bar -->
        <tr><td style="background:#002b4c;color:#ffffff;padding:14px 28px;">
          <table width="100%"><tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:17px;letter-spacing:.4px;">
              ${APP_NAME}
            </td>
            <td align="right" style="font-size:10px;color:rgba(255,255,255,0.7);letter-spacing:.18em;text-transform:uppercase;">
              ${isFr ? 'Notification automatique' : 'Automated notification'}
            </td>
          </tr></table>
        </td></tr>

        ${
          isCritical
            ? `
        <!-- Critical severity bar (institutional) -->
        <tr><td style="background:#0a0507;color:#ffffff;padding:10px 28px;border-top:2px solid #c8102e;">
          <table width="100%"><tr>
            <td style="font-size:10.5px;letter-spacing:.32em;text-transform:uppercase;font-weight:700;color:#ffd5d9;">
              ${isFr ? 'Niveau de Gravité' : 'Severity Level'}
            </td>
            <td align="right" style="font-size:10.5px;letter-spacing:.32em;text-transform:uppercase;font-weight:700;color:#ffffff;">
              ${isFr ? 'Critique' : 'Critical'} · ${isFr ? 'Action Obligatoire' : 'Mandatory Action'}
            </td>
          </tr></table>
        </td></tr>`
            : ''
        }

        <!-- Hero band (status-reactive accent) -->
        <tr><td style="background:${theme.accent};color:#ffffff;padding:30px 32px;">
          <table width="100%"><tr>
            <td valign="top" style="width:64px;">
              <div style="width:52px;height:52px;border-radius:10px;background:rgba(255,255,255,0.14);text-align:center;line-height:52px;color:#ffffff;">
                <span style="display:inline-block;vertical-align:middle;line-height:0;">${svgIcon(icon)}</span>
              </div>
            </td>
            <td valign="top" style="padding-left:16px;">
              <div style="margin-bottom:10px;">
                ${pill}
                ${statusLabel ? `<span style="display:inline-block;margin-left:6px;background:rgba(255,255,255,0.22);color:#ffffff;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid rgba(255,255,255,0.35);">${statusLabel}</span>` : ''}
              </div>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:24px;line-height:1.25;color:#ffffff;">
                ${heroTitle}
              </h1>
              <div style="margin-top:6px;font-size:12.5px;color:rgba(255,255,255,0.85);">
                ${subject}
              </div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px 4px;">
          ${
            isCritical
              ? `
          <div style="margin:0 0 22px;padding:14px 18px;background:#fdecee;border-left:4px solid #5a0511;border-radius:4px;">
            <div style="font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#5a0511;margin-bottom:4px;">
              ${isFr ? "Procédure d'escalade — Niveau Critique" : 'Escalation Procedure — Critical Level'}
            </div>
            <div style="font-size:13px;color:#3f1216;line-height:1.5;">
              ${
                isFr
                  ? 'Ce message vous est adressé conformément à la politique interne de gestion des risques. Une intervention coordonnée de la Direction est requise dans les meilleurs délais.'
                  : 'This message is sent to you under the internal risk management policy. A coordinated intervention from Management is required as soon as possible.'
              }
            </div>
          </div>`
              : ''
          }
          ${bodyToHtml(body)}
          ${factsBlock}
          ${ctaBlock}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f6f2ea;border-top:1px solid #e8e0d0;padding:18px 32px;font-size:11px;color:#6b7280;line-height:1.5;">
          <div>${isFr ? `Vous recevez cet email parce qu'il fait partie de la matrice de notifications ${APP_NAME}. Un administrateur peut modifier les destinataires depuis le panneau « Notifications email ».` : `You're receiving this email because it's part of the ${APP_NAME} notification matrix. An admin can change recipients from the "Email notifications" panel.`}</div>
          <div style="margin-top:6px;color:#9ca3af;">© ${new Date().getFullYear()} ${APP_NAME} — Enterprise Risk Management</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Inline SVG glyph table for the hero icon. Email clients strip web fonts
// (Material Icons won't render), but every major client supports inline
// <svg> with `currentColor`. We keep them simple, single-stroke and 28px so
// they sit cleanly inside the 48 px tile.
const SVG_ICONS = {
  pin: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  verified_user:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  block:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  how_to_reg:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>',
  fact_check:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/><path d="M3 9h18"/></svg>',
  check_circle:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  cancel:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  event_busy:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="14" x2="15" y2="20"/><line x1="15" y1="14" x2="9" y2="20"/></svg>',
  trending_up:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  crisis_alert:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  flag: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  today:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  insights:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/></svg>',
  verified:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/><path d="m9 12 2 2 4-4"/></svg>',
  event:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="15" r="2" fill="currentColor"/></svg>',
  request_quote:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18V11"/><path d="M9 14h6"/></svg>',
  gavel:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>',
  admin_panel_settings:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  mail: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
};

function svgIcon(name) {
  return SVG_ICONS[name] || SVG_ICONS.mail;
}

// ── Main API ──────────────────────────────────────────────────────────
async function dispatchEvent(key, data = {}, options = {}) {
  try {
    if (!options.bypassMaster && !(await isMailEnabled())) {
      console.log(`[dispatchEvent] ${key} skipped — global mail disabled`);
      return;
    }
    const evt = await EmailEvent.findOne({ key });
    if (!evt) {
      console.warn(`[dispatchEvent] unknown event "${key}"`);
      return;
    }
    if (!evt.active) return;

    // Resolve recipients — when testOnly we skip role users and use only extras.
    const roleRecipients =
      !options.testOnly && evt.defaultRoles.length
        ? await User.find({ role: { $in: evt.defaultRoles }, status: 'approved' }).select(
            '_id name email role'
          )
        : [];

    const extra = (options.extraRecipients || []).filter(Boolean);

    const all = [...roleRecipients, ...extra];
    const seen = new Set();
    const recipients = all.filter((u) => {
      const id = String(u._id || u.email || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return Boolean(u.email);
    });

    if (recipients.length === 0) return;

    const lang = options.lang || 'fr';
    const ctx = { ...data, appUrl: APP_URL, appName: APP_NAME };

    const subject = render(lang === 'fr' ? evt.titleFr : evt.titleEn, ctx);
    const body = render(lang === 'fr' ? evt.bodyFr : evt.bodyEn, ctx);

    const t = getTransport();
    for (const r of recipients) {
      // Attach the recipient as `recipient` token so messages can address them by name
      const personalCtx = { ...ctx, recipient: r };
      const personalSubj = render(subject, { recipient: r });
      const personalBody = render(body, { recipient: r });
      t.sendMail({
        from: MAIL_FROM,
        to: r.email,
        subject: personalSubj,
        text: personalBody,
        html: htmlWrap({
          event: evt,
          lang,
          subject: personalSubj,
          body: personalBody,
          ctx: personalCtx,
        }),
      }).catch((err) => console.error(`[dispatchEvent ${key}] sendMail failed: ${err.message}`));
    }

    console.log(`[dispatchEvent] ${key} → ${recipients.length} recipient(s)`);
  } catch (err) {
    console.error(`[dispatchEvent ${key}] ${err.message}`);
  }
}

module.exports = { dispatchEvent, render, isMailEnabled, bustMailEnabledCache };
