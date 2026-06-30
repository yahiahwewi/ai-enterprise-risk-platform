const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendOtpEmail } = require('../services/mailer');
const { dispatchEvent } = require('../services/eventDispatcher');

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const OTP_TTL_MIN = 15; // code valid for 15 minutes
const OTP_RESEND_COOLDOWN = 60; // seconds between resend requests
const OTP_MAX_ATTEMPTS = 6;

const { business } = require('../middleware/metrics');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

async function issueOtpForUser(user) {
  const code = generateOtp();
  user.emailOtpHash = await bcrypt.hash(code, 10);
  user.emailOtpExpires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  user.emailOtpAttempts = 0;
  user.emailOtpLastSentAt = new Date();
  await user.save();
  // Fire-and-log the email; don't block the response if SMTP is slow.
  sendOtpEmail({ to: user.email, name: user.name, code, minutes: OTP_TTL_MIN }).catch((err) =>
    console.error('[mailer] sendOtpEmail failed:', err.message)
  );
  return code;
}

// POST /api/auth/register — public signup: email OTP first, then admin approval
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const allowedRoles = ['accountant', 'finance', 'analyst', 'auditor'];
    const safeRole = allowedRoles.includes(role) ? role : 'accountant';

    const existing = await User.findOne({ email }).select(
      '+emailOtpHash +emailOtpExpires +emailOtpLastSentAt'
    );

    // If the user exists but hasn't verified yet, just refresh the OTP.
    if (existing) {
      if (existing.emailVerified) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      // overwrite pwd / name / role so a user can re-try signup if they mistyped
      existing.name = name;
      existing.password = password; // will be re-hashed by pre-save
      existing.role = safeRole;
      existing.status = 'pending';
      await issueOtpForUser(existing);
      return res.status(200).json({
        message: 'Compte existant non vérifié — un nouveau code vous a été envoyé.',
        email: existing.email,
        needsVerification: true,
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      status: 'pending',
      emailVerified: false,
    });

    await issueOtpForUser(user);
    business.signups.inc({ role: safeRole });

    res.status(201).json({
      message: 'Compte créé. Un code de vérification vous a été envoyé par email.',
      email: user.email,
      needsVerification: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/verify-email — confirm the 6-digit code
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email }).select(
      '+emailOtpHash +emailOtpExpires +emailOtpAttempts'
    );
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.emailVerified) {
      return res.status(200).json({ message: 'Email déjà vérifié', verified: true });
    }
    if (!user.emailOtpHash || !user.emailOtpExpires) {
      return res.status(400).json({ message: 'Aucun code actif. Demandez un nouveau code.' });
    }
    if (user.emailOtpExpires < new Date()) {
      return res.status(400).json({ message: 'Code expiré. Demandez un nouveau code.' });
    }
    if (user.emailOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    const ok = await bcrypt.compare(code, user.emailOtpHash);
    if (!ok) {
      user.emailOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Code incorrect' });
    }

    user.emailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpires = undefined;
    user.emailOtpAttempts = 0;
    await user.save();

    // Notify admins that a verified signup is awaiting their approval
    dispatchEvent('auth.signup_pending', {
      user: { name: user.name, email: user.email, role: user.role },
    }).catch(() => {});

    res.json({
      message:
        "Email vérifié. Votre compte est désormais en attente de validation par l'administrateur.",
      verified: true,
      pending: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/resend-otp — re-issue a code (rate-limited by cooldown)
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select(
      '+emailOtpHash +emailOtpExpires +emailOtpLastSentAt'
    );
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email déjà vérifié' });
    }
    const last = user.emailOtpLastSentAt ? user.emailOtpLastSentAt.getTime() : 0;
    const sinceLast = (Date.now() - last) / 1000;
    if (sinceLast < OTP_RESEND_COOLDOWN) {
      return res.status(429).json({
        message: `Patientez ${Math.ceil(OTP_RESEND_COOLDOWN - sinceLast)}s avant de redemander un code.`,
        cooldownSeconds: Math.ceil(OTP_RESEND_COOLDOWN - sinceLast),
      });
    }
    await issueOtpForUser(user);
    res.json({ message: 'Nouveau code envoyé.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      business.logins.inc({ result: 'failed' });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        message: "Votre compte est en attente de validation par l'administrateur.",
        status: 'pending',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        message: "Votre demande d'accès a été refusée.",
        status: 'rejected',
      });
    }

    business.logins.inc({ result: 'success' });
    res.json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/google — sign in / sign up with a Google ID token
exports.googleLogin = async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({
        message: 'Google OAuth non configuré côté serveur (GOOGLE_CLIENT_ID manquant).',
      });
    }
    const { credential, role } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Token Google requis' });
    }

    // Verify the ID token signature + audience
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, email_verified } = payload || {};
    if (!email || !email_verified) {
      return res.status(400).json({ message: 'Compte Google non vérifié' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // First Google sign-in → create a pending account, awaiting admin approval
      const allowedRoles = ['accountant', 'finance', 'analyst', 'auditor'];
      const safeRole = allowedRoles.includes(role) ? role : 'accountant';
      // random password — user won't use it (Google flow only) but the schema requires one
      const randomPwd = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: randomPwd,
        role: safeRole,
        status: 'pending',
        emailVerified: true, // Google already vouched for the address
      });
      return res.status(201).json({
        message: "Compte Google créé. En attente de validation par l'administrateur.",
        pending: true,
        status: 'pending',
        email: user.email,
      });
    }

    // Existing user
    if (!user.emailVerified) {
      // Mark as verified now that Google confirmed the address
      user.emailVerified = true;
      await user.save();
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        message: "Votre compte est en attente de validation par l'administrateur.",
        status: 'pending',
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        message: "Votre demande d'accès a été refusée.",
        status: 'rejected',
      });
    }

    business.logins.inc({ result: 'success' });
    res.json({ user, token: generateToken(user._id) });
  } catch (error) {
    console.error('[google-login]', error.message);
    res.status(401).json({ message: "Échec de l'authentification Google" });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json(req.user);
};
