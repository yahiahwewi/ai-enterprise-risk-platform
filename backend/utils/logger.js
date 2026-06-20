/**
 * Centralized structured logger (Winston).
 *
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Invoice created', { invoiceId, userId, amount });
 *   logger.error('Signing failed', { err: err.message });
 *
 * Levels: error < warn < info < http < debug
 * Controlled by LOG_LEVEL env var (default: info, or debug in development).
 *
 * In production: JSON logs (machine-parseable for ELK/CloudWatch/Datadog).
 * In development: colorized, human-readable console output.
 */
const winston = require('winston');
const { isSensitiveKey, redactSensitive } = require('./redact');

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// Redact sensitive fields so secrets never land in logs.
// Mutate the winston `info` object IN PLACE at the top level so its internal
// Symbol keys (level/message/splat) survive; nested objects are deep-redacted.
const redact = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (isSensitiveKey(key)) {
      info[key] = '[REDACTED]';
    } else if (info[key] !== null && typeof info[key] === 'object') {
      info[key] = redactSensitive(info[key]);
    }
  }
  return info;
});

const devFormat = winston.format.combine(
  redact(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level: lvl, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${lvl}: ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  redact(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level,
  format: isProd ? prodFormat : devFormat,
  defaultMeta: { service: 'tactic-backend' },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

// In production also persist to rotating files.
if (isProd) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10_485_760,
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({ filename: 'logs/combined.log', maxsize: 10_485_760, maxFiles: 5 })
  );
}

// Stream adapter so Morgan can pipe HTTP logs through Winston.
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
