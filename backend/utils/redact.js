/**
 * Recursively redact sensitive fields from an object before it is logged.
 * Pure function — no side effects — so it is trivially unit-testable.
 *
 * Any key whose name contains one of SENSITIVE_KEYS (case-insensitive) has
 * its value replaced with '[REDACTED]'. Nested objects/arrays are walked.
 */
const SENSITIVE_KEYS = [
  'password',
  'pass',
  'token',
  'jwt',
  'secret',
  'otp',
  'authorization',
  'apikey',
  'api_key',
];

function isSensitiveKey(key) {
  const lower = String(key).toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

function redactSensitive(input) {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((item) => redactSensitive(item));

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) {
      out[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object') {
      out[key] = redactSensitive(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

module.exports = { redactSensitive, isSensitiveKey, SENSITIVE_KEYS };
