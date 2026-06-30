/**
 * createBot.js — provision a dedicated READ-ONLY assistant bot account
 * (for the OpenClaw / WhatsApp integration) and mint a long-lived JWT for it.
 *
 * The bot authenticates to the API with the printed bearer token (not a password).
 * Role `analyst` grants read access to the AI/risk endpoints
 * (/api/ai/risk-report, /final-decision, /simulate, /health-index) without
 * approval/transfer/admin powers. Store the token as a secret in OpenClaw.
 *
 * Run it against the SAME backend OpenClaw will call (use that backend's
 * MONGO_URI + JWT_SECRET, so the token is accepted and the account exists there):
 *
 *   # local / docker-compose backend
 *   MONGO_URI="mongodb://localhost:27017/erm_platform" JWT_SECRET="<local secret>" \
 *     node scripts/createBot.js
 *
 *   # production (Atlas + prod secret)
 *   MONGO_URI="mongodb+srv://.../erm_platform" JWT_SECRET="<prod secret>" \
 *     node scripts/createBot.js
 *
 * Optional env: BOT_EMAIL, BOT_NAME, BOT_ROLE (default analyst), BOT_TOKEN_TTL (default 365d).
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Works whether run from backend/ (./scripts) or copied to /app root.
let User;
try {
  User = require('../models/User');
} catch {
  User = require('./models/User');
}

const EMAIL = process.env.BOT_EMAIL || 'assistant-bot@tac-tic.local';
const NAME = process.env.BOT_NAME || 'WhatsApp Assistant (read-only bot)';
const ROLE = process.env.BOT_ROLE || 'analyst';
const TTL = process.env.BOT_TOKEN_TTL || '365d';

(async () => {
  const uri = process.env.MONGO_URI;
  const secret = process.env.JWT_SECRET;
  if (!uri || !secret) {
    console.error('ERROR: set MONGO_URI and JWT_SECRET (must match the target backend).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('connected: db=%s host=%s', mongoose.connection.name, mongoose.connection.host);

  let bot = await User.findOne({ email: EMAIL });
  if (bot) {
    bot.name = NAME;
    bot.role = ROLE;
    bot.status = 'approved';
    bot.emailVerified = true;
    await bot.save();
    console.log('updated bot account: %s (%s)', EMAIL, ROLE);
  } else {
    bot = await User.create({
      name: NAME,
      email: EMAIL,
      password: crypto.randomBytes(24).toString('hex'), // never used — bot auths via token
      role: ROLE,
      status: 'approved',
      emailVerified: true,
    });
    console.log('created bot account: %s (%s)', EMAIL, ROLE);
  }

  const token = jwt.sign({ id: bot._id }, secret, { expiresIn: TTL });

  console.log('\n──────── BOT BEARER TOKEN (ttl=%s) — STORE AS A SECRET IN OPENCLAW ────────', TTL);
  console.log(token);
  console.log('──────────────────────────────────────────────────────────────────────────\n');
  console.log('Use as HTTP header:  Authorization: Bearer <token>');
  console.log(
    'Smoke test:          curl -H "Authorization: Bearer <token>" <API_BASE>/api/ai/health-index'
  );
  console.log(
    'Reachable read endpoints (analyst): /api/ai/risk-report, /final-decision, /simulate, /health-index'
  );
  console.log(
    'NOTE: /api/ai/copilot is owner-only today — open it to "analyst" to let the bot relay NL questions.'
  );

  await mongoose.disconnect();
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
