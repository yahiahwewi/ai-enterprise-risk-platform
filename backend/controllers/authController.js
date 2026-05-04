const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../services/mailer');

const OTP_TTL_MIN = 15;        // code valid for 15 minutes
const OTP_RESEND_COOLDOWN = 60; // seconds between resend requests
const OTP_MAX_ATTEMPTS = 6;

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateOtp = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

async function issueOtpForUser(user) {
  const code = generateOtp();
  user.emailOtpHash = await bcrypt.hash(code, 10);
  user.emailOtpExpires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  user.emailOtpAttempts = 0;
  user.emailOtpLastSentAt = new Date();
  await user.save();
  // Fire-and-log the email; don't block the response if SMTP is slow.
  sendOtpEmail({ to: user.email, name: user.name, code, minutes: OTP_TTL_MIN })
    .catch((err) => console.error('[mailer] sendOtpEmail failed:', err.message));
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

    res.json({
      message: 'Email vérifié. Votre compte est désormais en attente de validation par l\'administrateur.',
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
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        message: 'Votre compte est en attente de validation par l\'administrateur.',
        status: 'pending',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        message: 'Votre demande d\'accès a été refusée.',
        status: 'rejected',
      });
    }

    res.json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json(req.user);
};
