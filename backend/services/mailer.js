/**
 * Email service — nodemailer transport with HTML templates.
 * If SMTP env vars are missing we fall back to console.log so the dev
 * flow never breaks (useful during PFE demo on a laptop without SMTP).
 */
const nodemailer = require('nodemailer');

const APP_NAME = process.env.APP_NAME || 'Tac-Tic ERM';
const MAIL_FROM = process.env.MAIL_FROM || `${APP_NAME} <no-reply@tactic-erm.local>`;

let transporter = null;
let transportReady = false;

function getTransport() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[mailer] SMTP not configured — emails will be logged to console only.');
    transporter = {
      sendMail: async (opts) => {
        console.log('\n───── EMAIL (dev fallback) ─────');
        console.log('To:      ', opts.to);
        console.log('Subject: ', opts.subject);
        console.log('Body:    ', (opts.text || '').slice(0, 500));
        console.log('────────────────────────────────\n');
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

  transporter.verify((err) => {
    if (err) console.error('[mailer] SMTP verify failed:', err.message);
    else {
      transportReady = true;
      console.log('[mailer] SMTP ready.');
    }
  });

  return transporter;
}

function otpEmailHtml({ name, code, minutes = 15 }) {
  return `
  <!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#f6f2ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ea;padding:32px 0;">
        <tr><td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e0d0;border-radius:6px;overflow:hidden;">
            <tr><td style="background:#002b4c;color:#ffffff;padding:24px 32px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.5px;">${APP_NAME}</div>
              <div style="font-size:11px;color:#b8860b;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Vérification de compte</div>
            </td></tr>
            <tr><td style="padding:32px;">
              <p style="font-size:15px;margin:0 0 14px;">Bonjour ${name || ''},</p>
              <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#333;">
                Merci de vous être inscrit sur ${APP_NAME}. Veuillez saisir le code suivant
                pour vérifier votre adresse email. Votre compte sera ensuite soumis à la
                validation de l'administrateur.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <div style="display:inline-block;padding:18px 34px;background:#f6f2ea;border:2px solid #002b4c;border-radius:6px;font-family:'Courier New',monospace;font-size:32px;letter-spacing:10px;font-weight:bold;color:#002b4c;">
                  ${code}
                </div>
              </div>
              <p style="font-size:13px;color:#666;margin:0 0 8px;">
                Ce code expire dans <strong>${minutes} minutes</strong>.
              </p>
              <p style="font-size:12px;color:#999;margin:24px 0 0;">
                Si vous n'avez pas créé de compte, ignorez simplement cet email.
              </p>
            </td></tr>
            <tr><td style="background:#f6f2ea;border-top:1px solid #e8e0d0;padding:14px 32px;font-size:11px;color:#888;text-align:center;">
              © ${new Date().getFullYear()} ${APP_NAME} — Enterprise Risk Management
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

async function sendOtpEmail({ to, name, code, minutes = 15 }) {
  const t = getTransport();
  return t.sendMail({
    from: MAIL_FROM,
    to,
    subject: `${APP_NAME} — Code de vérification : ${code}`,
    text: `Bonjour ${name || ''},\n\nVotre code de vérification ${APP_NAME} est : ${code}\n\nIl expire dans ${minutes} minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: otpEmailHtml({ name, code, minutes }),
  });
}

async function sendApprovalEmail({ to, name, approved, reason }) {
  const t = getTransport();
  const subject = approved
    ? `${APP_NAME} — Votre compte a été approuvé`
    : `${APP_NAME} — Votre demande d'accès a été refusée`;
  const body = approved
    ? `Bonjour ${name || ''},\n\nVotre compte ${APP_NAME} a été approuvé par l'administrateur.\nVous pouvez désormais vous connecter.`
    : `Bonjour ${name || ''},\n\nVotre demande d'accès à ${APP_NAME} a été refusée.\n${reason ? 'Motif : ' + reason : ''}`;
  return t.sendMail({ from: MAIL_FROM, to, subject, text: body });
}

function genericEmailHtml({ subject, body }) {
  const esc = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const htmlBody = esc(body).replace(/\n/g, '<br>');
  return `
  <!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#f6f2ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ea;padding:32px 0;">
        <tr><td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e0d0;border-radius:6px;overflow:hidden;">
            <tr><td style="background:#002b4c;color:#ffffff;padding:24px 32px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.5px;">${APP_NAME}</div>
              <div style="font-size:11px;color:#b8860b;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Enterprise Risk Management</div>
            </td></tr>
            <tr><td style="padding:32px;">
              ${subject ? `<p style="font-size:16px;font-weight:bold;margin:0 0 14px;color:#002b4c;">${esc(subject)}</p>` : ''}
              <div style="font-size:14px;line-height:1.6;color:#333;">${htmlBody}</div>
            </td></tr>
            <tr><td style="background:#f6f2ea;border-top:1px solid #e8e0d0;padding:14px 32px;font-size:11px;color:#888;text-align:center;">
              © ${new Date().getFullYear()} ${APP_NAME} — Enterprise Risk Management
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

/**
 * Send a free-form email (used by the assistant/bot via /api/ai/send-email).
 * Wraps the plain-text body in the branded Tac-Tic template.
 */
async function sendCustomEmail({ to, subject, body }) {
  const t = getTransport();
  return t.sendMail({
    from: MAIL_FROM,
    to,
    subject: subject || APP_NAME,
    text: body,
    html: genericEmailHtml({ subject, body }),
  });
}

module.exports = { sendOtpEmail, sendApprovalEmail, sendCustomEmail };
