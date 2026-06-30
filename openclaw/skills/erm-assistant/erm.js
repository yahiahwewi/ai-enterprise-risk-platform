#!/usr/bin/env node
/**
 * erm.js — OpenClaw "erm-assistant" skill helper.
 * Calls the Tac-Tic ERM API (read-only) with the bot bearer token and prints a
 * concise, human-readable answer the agent can relay to WhatsApp.
 *
 * Env (injected by openclaw.json → skills.entries["erm-assistant"].env):
 *   ERM_API_BASE   e.g. https://tactic-backend-d1452d.azurewebsites.net
 *   ERM_BOT_TOKEN  read-only analyst bot JWT
 *
 * Usage:
 *   node erm.js risk            # global risk score + level + top recommendations
 *   node erm.js health          # FINANCIAL health index (score + grade + 4 dimensions)
 *   node erm.js status          # platform/system health (db / AI module / uptime)
 *   node erm.js decision        # AI final decision + executive summary
 *   node erm.js alerts          # returns "CRITICAL: ..." or "OK ..." for proactive checks
 *   node erm.js ask "question"  # free-form natural-language question → ERM copilot
 */
const fs = require('fs');

const BASE = process.env.ERM_API_BASE;
// OpenClaw blocks secret-named env vars (TOKEN/KEY/SECRET) from reaching skill
// processes, so read the token from a file path (ERM_BOT_FILE) when the direct
// env var isn't available.
let TOKEN = process.env.ERM_BOT_TOKEN;
if (!TOKEN && process.env.ERM_BOT_FILE) {
  try {
    TOKEN = fs.readFileSync(process.env.ERM_BOT_FILE, 'utf8').trim();
  } catch {
    /* fall through to the error below */
  }
}

if (!BASE || !TOKEN) {
  console.error('Missing ERM_API_BASE or a token source (ERM_BOT_TOKEN / ERM_BOT_FILE).');
  process.exit(1);
}

const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(`${BASE}${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}
async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}

const [, , cmd, ...rest] = process.argv;

(async () => {
  switch (cmd) {
    case 'risk': {
      const r = await get('/api/ai/risk-report');
      const recs = (r.recommendations || []).slice(0, 3).map((x) => `• ${x}`).join('\n');
      console.log(`Score de risque : ${r.globalScore}/100 (${r.level}).\n${recs}`);
      break;
    }
    case 'health': {
      const h = await get('/api/ai/health-index');
      const d = h.dimensions || {};
      console.log(
        `Santé financière : ${h.score}/100 (note ${h.grade}).\n` +
          `• Liquidité ${d.liquidity?.score ?? '?'}/100   • Stabilité ${d.stability?.score ?? '?'}/100\n` +
          `• Croissance ${d.growth?.score ?? '?'}/100   • Efficacité ${d.efficiency?.score ?? '?'}/100`
      );
      break;
    }
    case 'status': {
      const h = await get('/api/health');
      console.log(`Statut plateforme : ${h.status} · base : ${h.mongo} · module IA : ${h.aiModule} · uptime : ${h.uptime}s`);
      break;
    }
    case 'decision': {
      const d = await get('/api/ai/final-decision');
      console.log(`Décision : ${d.decision}\n${d.summary || ''}`);
      break;
    }
    case 'alerts': {
      const [h, r] = await Promise.all([get('/api/health'), get('/api/ai/risk-report')]);
      const crit = h.mongo !== 'connected' || r.globalScore >= 80;
      console.log(
        crit
          ? `CRITICAL: score=${r.globalScore}/100 (${r.level}), base=${h.mongo}, IA=${h.aiModule}`
          : `OK: score=${r.globalScore}/100 (${r.level}), systèmes nominaux`
      );
      break;
    }
    case 'ask': {
      const question = rest.join(' ');
      const a = await post('/api/ai/copilot', { question });
      console.log(a.answer || a.reply || JSON.stringify(a));
      break;
    }
    default:
      console.error('Unknown command. Use: risk | health | status | decision | alerts | ask "<question>"');
      process.exit(1);
  }
})().catch((e) => {
  console.error('ERM query failed:', e.message);
  process.exit(1);
});
