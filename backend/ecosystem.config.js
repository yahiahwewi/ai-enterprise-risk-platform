/**
 * PM2 process manager config for the backend (production).
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 logs tactic-backend
 *   pm2 reload tactic-backend   # zero-downtime reload
 *   pm2 save && pm2 startup     # persist across reboots
 *
 * Cluster mode runs one worker per CPU core for throughput + resilience.
 * NOTE: node-cron jobs in scheduler.js will fire in EVERY worker. For multi-
 * instance deployments, gate the scheduler to a single instance using
 * process.env.NODE_APP_INSTANCE === '0' (see scheduler hardening note in
 * DEVOPS_REPORT.md, Phase 3).
 */
module.exports = {
  apps: [
    {
      name: 'tactic-backend',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
