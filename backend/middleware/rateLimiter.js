const rateLimit = require('express-rate-limit');

// /auth/me is hit on every route change to refresh the user session — it
// must NOT count against the login-brute-force limiter.
const skipMe = (req) => req.path === '/me';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipMe,
  message: { message: 'Too many authentication attempts, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

module.exports = { authLimiter, apiLimiter };
