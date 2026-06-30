import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { SkeletonKPIGrid } from '../../components/Skeleton';
import FinancialInsights from '../../components/FinancialInsights';
import FinalDecision from '../FinalDecision';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

// ── Dev Scenario Panel (kept functional, discrete look) ────────────────────
function DevScenarioPanel({ onRefresh }) {
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(null);
  const { addToast } = useToast();
  const { lang } = useLang();

  const seed = async (scenario) => {
    setSeeding(scenario);
    try {
      const res = await api.post(`/dev/seed/${scenario}`);
      addToast(
        'success',
        scenario === 'good'
          ? lang === 'fr'
            ? '✓ Bon scénario chargé'
            : '✓ Good scenario loaded'
          : lang === 'fr'
            ? '⚠ Mauvais scénario chargé'
            : '⚠ Bad scenario loaded',
        res.data.message
      );
      await onRefresh();
    } catch (err) {
      addToast('error', 'Erreur', err.response?.data?.message || err.message);
    } finally {
      setSeeding(null);
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="small-caps text-[#8b8672] hover:text-[#002b4c] flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[16px]">science</span>
        {lang === 'fr' ? 'Scénarios de démonstration' : 'Demo scenarios'}
        <span
          className="material-symbols-outlined text-[14px]"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => seed('good')}
            disabled={!!seeding}
            className="editorial-btn-ghost text-xs disabled:opacity-50"
            style={{ borderColor: '#86c5a9', color: '#0d7a4a' }}
          >
            {seeding === 'good' ? '…' : lang === 'fr' ? '▶ Bon scénario' : '▶ Good scenario'}
          </button>
          <button
            onClick={() => seed('bad')}
            disabled={!!seeding}
            className="editorial-btn-ghost text-xs disabled:opacity-50"
            style={{ borderColor: '#e8a3ad', color: '#c8102e' }}
          >
            {seeding === 'bad' ? '…' : lang === 'fr' ? '▶ Mauvais scénario' : '▶ Bad scenario'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t, lang } = useLang();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/ai/risk-report');
      setReport(r.data);
    } catch {
      addToast('error', t('toast.error'), t('toast.failed'));
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading)
    return (
      <div>
        <EditorialHeader />
        <SkeletonKPIGrid count={4} />
      </div>
    );
  if (!report)
    return (
      <div className="editorial-card p-8 text-center text-[#6b7280]">{t('common.noData')}</div>
    );

  const score = report.globalScore;
  const level = report.level;

  // Decision tier mapping
  const decision = (() => {
    if (score >= 75)
      return {
        banner:
          lang === 'fr'
            ? 'DÉCISION : RISQUE CRITIQUE — ACTION IMMÉDIATE'
            : 'DECISION: CRITICAL RISK — IMMEDIATE ACTION',
        sub:
          lang === 'fr'
            ? "Une intervention stratégique immédiate est requise pour stabiliser l'entreprise."
            : 'An immediate strategic intervention is required to stabilise the company.',
        cta: lang === 'fr' ? 'Alerte Critique' : 'Critical Alert',
      };
    if (score >= 50)
      return {
        banner:
          lang === 'fr'
            ? 'DÉCISION : RISQUE ÉLEVÉ — ACTION REQUISE'
            : 'DECISION: HIGH RISK — ACTION REQUIRED',
        sub:
          lang === 'fr'
            ? 'Une intervention stratégique immédiate est recommandée pour stabiliser les flux de trésorerie.'
            : 'An immediate strategic intervention is recommended to stabilise cash flows.',
        cta: lang === 'fr' ? 'Alerte Critique' : 'Critical Alert',
      };
    if (score >= 25)
      return {
        banner:
          lang === 'fr'
            ? 'DÉCISION : RISQUE MODÉRÉ — SURVEILLANCE'
            : 'DECISION: MODERATE RISK — MONITOR',
        sub:
          lang === 'fr'
            ? 'Des signaux avant-coureurs sont détectés, un suivi rapproché est conseillé.'
            : 'Early signals detected, close monitoring is advised.',
        cta: lang === 'fr' ? "Voir l'analyse" : 'View analysis',
      };
    return {
      banner: lang === 'fr' ? 'DÉCISION : SITUATION STABLE' : 'DECISION: STABLE',
      sub:
        lang === 'fr'
          ? 'Aucun risque majeur détecté ce mois-ci. Poursuivre la stratégie actuelle.'
          : 'No major risk detected this month. Keep the current strategy.',
      cta: lang === 'fr' ? 'Voir le détail' : 'See details',
    };
  })();

  const isAlert = score >= 50;

  // Pick 3 leading cause cards from the breakdown (highest scores first)
  const DOMAIN_META = {
    cashFlow: {
      fr: 'Prévisions de trésorerie faibles',
      en: 'Weak cash flow forecasts',
      descFr: 'Seuils critiques atteints pour la prochaine période.',
      descEn: 'Critical thresholds reached for the next period.',
      icon: 'account_balance_wallet',
    },
    invoices: {
      fr: 'Part des factures en retard élevée',
      en: 'High share of overdue invoices',
      descFr: 'Impact direct sur le fonds de roulement opérationnel.',
      descEn: 'Direct impact on operating working capital.',
      icon: 'description',
    },
    debt: {
      fr: 'Endettement en progression',
      en: 'Rising indebtedness',
      descFr: 'Ratio dette/actifs au-dessus de la cible sectorielle.',
      descEn: 'Debt-to-asset ratio above sector target.',
      icon: 'credit_score',
    },
    loanBurden: {
      fr: "Charge d'emprunts en hausse",
      en: 'Loan burden rising',
      descFr: 'Remboursements mensuels qui grignotent la trésorerie.',
      descEn: 'Monthly repayments eating into liquidity.',
      icon: 'savings',
    },
  };
  const topCauses = Object.entries(report.breakdown)
    .map(([k, v]) => ({ key: k, score: v.score, weight: v.weight, ...DOMAIN_META[k] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 3 recommended actions (fallback to explanations)
  const recs = (report.recommendations || []).slice(0, 3);
  while (recs.length < 3) recs.push(null);

  return (
    <div>
      <EditorialHeader />

      <DevScenarioPanel onRefresh={fetchReport} />

      {/* ─── DECISION BANNER (with integrated Global Risk Score) ─── */}
      <div
        className={`mb-8 ${isAlert ? 'editorial-alert-banner' : 'editorial-card'}`}
        style={!isAlert ? { borderLeft: '6px solid #0d7a4a', padding: '22px 28px' } : undefined}
      >
        <div className="flex items-center justify-between gap-6 flex-wrap relative z-10">
          <div className="flex-1 min-w-[280px]">
            <h2
              className={`font-editorial text-[26px] md:text-[32px] font-black leading-tight ${isAlert ? 'text-white' : 'text-[#0b1f33]'}`}
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {decision.banner}
            </h2>
            <p className={`mt-2 text-sm max-w-2xl ${isAlert ? 'text-white/90' : 'text-[#4a5568]'}`}>
              {decision.sub}
            </p>
            <Link
              to="/alerts"
              className={`inline-block mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${
                      isAlert
                        ? 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
                        : 'bg-[#002b4c] text-white hover:bg-[#001a2e]'
                    }`}
            >
              {decision.cta}
            </Link>
          </div>
          <div
            className="shrink-0 flex flex-col items-center gap-2 pl-2 md:pl-6 md:border-l md:border-white/15"
            style={!isAlert ? { borderLeftColor: '#e8e0d0' } : undefined}
          >
            <span
              className={`small-caps text-[10px] tracking-[0.18em] ${isAlert ? 'text-white/70' : 'text-[#6b7280]'}`}
            >
              {lang === 'fr' ? 'Score de Risque' : 'Global Risk Score'}
            </span>
            <ScoreDonut score={score} level={level} invert={isAlert} />
          </div>
        </div>
      </div>

      {/* ─── FINANCIAL INSIGHTS ─── */}
      <div className="mb-8">
        <FinancialInsights />
      </div>

      {/* ─── CAUSE CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {topCauses.map((c) => (
          <div key={c.key} className="editorial-card p-5">
            <div className="flex items-start gap-3">
              <div className="editorial-kpi-icon">
                <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[14px] text-[#0b1f33] leading-snug">
                  {lang === 'fr' ? c.fr : c.en}
                </p>
                <p className="text-[12px] text-[#6b7280] leading-relaxed mt-1">
                  {lang === 'fr' ? c.descFr : c.descEn}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── AI confidence badge (right aligned) ─── */}
      <div className="flex justify-end mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eef3f8] text-[#002b4c] text-[12px] font-semibold">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          {lang === 'fr' ? 'Indice de Confiance IA' : 'AI Confidence'} : {report.confidence}%
        </div>
      </div>

      {/* ─── RECOMMENDED ACTIONS ─── */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-5">
          <h3
            className="font-editorial text-[24px] font-extrabold text-[#0b1f33]"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {lang === 'fr' ? 'Actions Recommandées' : 'Recommended Actions'}
          </h3>
          <div className="flex items-center gap-1 small-caps text-[#8b8672]">
            {lang === 'fr' ? 'Priorité' : 'Priority'}
            <div
              className="ml-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#002b4c' }}
            >
              <span className="material-symbols-outlined text-white text-[15px]">bolt</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recs.map((text, i) => {
            // Fallback content if not enough recommendations
            const defaults = [
              {
                title: lang === 'fr' ? 'Contacter les clients principaux' : 'Contact key clients',
                body:
                  lang === 'fr'
                    ? 'Envoyer des rappels automatisés pour les factures impayées.'
                    : 'Send automated reminders for unpaid invoices.',
                cta: lang === 'fr' ? 'Lancer les rappels' : 'Trigger reminders',
                icon: 'group',
                link: '/invoices',
              },
              {
                title:
                  lang === 'fr'
                    ? 'Geler les dépenses non essentielles'
                    : 'Freeze non-essential spending',
                body:
                  lang === 'fr'
                    ? "Reporter les achats d'équipement non critiques pour le trimestre."
                    : 'Postpone non-critical equipment purchases this quarter.',
                cta: lang === 'fr' ? 'Appliquer le gel' : 'Apply freeze',
                icon: 'block',
                link: '/transactions',
              },
              {
                title: lang === 'fr' ? 'Reporter les nouvelles embauches' : 'Delay new hires',
                body:
                  lang === 'fr'
                    ? 'Suspendre le recrutement ouvert pour préserver les réserves de trésorerie.'
                    : 'Suspend open recruitment to preserve cash reserves.',
                cta: lang === 'fr' ? 'Suspendre recrutement' : 'Pause hiring',
                icon: 'person_off',
                link: '/team',
              },
            ];
            const card = text
              ? {
                  title: (text.split('.')[0] || '').trim().slice(0, 60),
                  body: text.trim(),
                  cta: lang === 'fr' ? 'Approfondir' : 'Deep-dive',
                  icon: ['group', 'block', 'person_off'][i] || 'task_alt',
                  link: '/risk-report',
                }
              : defaults[i];

            return (
              <div key={i} className="editorial-card p-6 flex flex-col">
                <div className="editorial-kpi-icon mb-4">
                  <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                </div>
                <h4
                  className="font-editorial text-[18px] font-bold text-[#0b1f33] leading-snug mb-2"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  {card.title}
                </h4>
                <p className="text-[13px] text-[#6b7280] leading-relaxed flex-1 mb-4">
                  {card.body}
                </p>
                <Link
                  to={card.link}
                  className="mt-auto text-center py-2 px-4 rounded-lg text-[12px] font-semibold border transition-all hover:bg-[#f6f2ea]"
                  style={{ borderColor: '#d8cfb9', color: '#002b4c' }}
                >
                  {card.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── MERGED: full AI decision report (formerly the standalone /final-decision page) ─── */}
      <section className="pt-2">
        <FinalDecision embedded />
      </section>

      {/* ─── BOTTOM CTA ─── */}
      <div className="flex justify-center pt-6 pb-8">
        <Link
          to="/risk-report"
          className="editorial-btn-primary inline-flex items-center gap-2 text-[14px]"
        >
          {lang === 'fr' ? 'Voir le rapport complet' : 'See full report'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>

      <p className="text-center editorial-confidential-footer">
        {lang === 'fr'
          ? 'Données actualisées en temps réel  —  Dernier scan : il y a 5 minutes'
          : 'Data refreshed in real time  —  Last scan: 5 minutes ago'}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
function EditorialHeader() {
  const { lang } = useLang();
  return (
    <section className="mb-8 flex items-center justify-between flex-wrap gap-3">
      <div>
        <div className="small-caps" style={{ color: '#8b8672' }}>
          {lang === 'fr' ? 'EXECUTIVE RISK EDITORIAL' : 'EXECUTIVE RISK EDITORIAL'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="small-caps text-[#6b7280]">
          {lang === 'fr' ? 'Document de travail · Confidentiel' : 'Working document · Confidential'}
        </span>
      </div>
    </section>
  );
}

function ScoreDonut({ score, level, invert = false }) {
  const color =
    level === 'critical'
      ? '#ff6b7a'
      : level === 'high'
        ? '#f59e42'
        : level === 'moderate'
          ? '#d97706'
          : '#0d7a4a';
  const trackColor = invert ? 'rgba(255,255,255,0.15)' : '#efe8dc';
  const numberColor = invert ? '#ffffff' : '#0b1f33';
  const subLabelColor = invert ? 'rgba(255,255,255,0.75)' : '#6b7280';
  const circumference = 2 * Math.PI * 84;
  const dashOffset = circumference * (1 - score / 100);
  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
        <circle cx="96" cy="96" r="84" fill="transparent" stroke={trackColor} strokeWidth="14" />
        <circle
          cx="96"
          cy="96"
          r="84"
          fill="transparent"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-editorial text-[48px] font-black leading-none tracking-tight"
          style={{ fontFamily: 'Playfair Display, Georgia, serif', color: numberColor }}
        >
          {score}
        </span>
        <span className="small-caps mt-1.5" style={{ color: subLabelColor }}>
          sur 100
        </span>
      </div>
    </div>
  );
}
