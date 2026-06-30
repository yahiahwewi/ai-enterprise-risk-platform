// Prometheus metrics for the backend.
// Exposes default Node process metrics (CPU, memory, event-loop lag, GC) plus
// per-request HTTP metrics, served at GET /metrics for Prometheus to scrape.
const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ app: 'tactic-backend' });
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

// Times every request and records it under the matched route pattern
// (e.g. /api/invoices/:id) to keep label cardinality bounded.
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    let route = (req.baseUrl || '') + (req.route && req.route.path ? req.route.path : '');
    if (!route) route = 'unmatched';
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}

async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { register, metricsMiddleware, metricsHandler };
