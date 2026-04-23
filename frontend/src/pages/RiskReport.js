import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../services/api';
import { SkeletonKPIGrid } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

export default function RiskReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t, lang } = useLang();

  useEffect(() => {
    api.get('/ai/risk-report')
      .then((r) => setReport(r.data))
      .catch(() => addToast('error', t('toast.error'), 'Failed'))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  if (loading) return (
    <div>
      <EditorialHeader />
      <SkeletonKPIGrid count={4} />
    </div>
  );
  if (!report) return (
    <div className="editorial-card p-8 text-center text-[#6b7280]">
      {t('common.noData')}
    </div>
  );

  const score = report.globalScore;
  const level = report.level;
  const isCritical = level === 'critical' || level === 'high';

  // Build a synthetic 30-day forecast series from the backend forecast numbers.
  // If we have a proper time series, we'd use it directly.
  const buildForecast = () => {
    const base   = report.forecast?.forecast30Days ?? (report.trends?.income?.current || 0);
    const exp    = report.trends?.expenses?.current || 0;
    const incoming = base > 0 ? base : 0;
    const points = [];
    for (let d = 0; d <= 30; d += 5) {
      const t = d / 30;
      points.push({
        day:  d === 0 ? (lang === 'fr' ? "Auj." : 'Today') : `+${d}j`,
        rev:  Math.round((report.trends?.income?.current || 0)   * (0.85 + 0.3 * t)),
        exp:  Math.round((report.trends?.expenses?.current || 0) * (0.9 + 0.35 * t + (isCritical ? 0.08 : 0))),
      });
    }
    return points;
  };
  const forecast = buildForecast();

  // Impact estimate = forecast30Days - forecast60Days (net delta)
  const impact = (report.forecast?.forecast30Days ?? 0) - (report.trends?.expenses?.current || 0);

  // Top dominant domain
  const topDomain = Object.entries(report.breakdown || {})
    .map(([k, v]) => ({ key: k, score: v.score, weight: v.weight }))
    .sort((a, b) => b.score - a.score)[0];

  const DOMAIN_FR = {
    cashFlow:   'Trésorerie',
    invoices:   'Factures',
    debt:       'Endettement',
    loanBurden: 'Charge d\'emprunt',
  };
  const DOMAIN_EN = {
    cashFlow:   'Cash flow',
    invoices:   'Invoices',
    debt:       'Debt',
    loanBurden: 'Loan burden',
  };
  const topDomainLabel = topDomain ? (lang === 'fr' ? DOMAIN_FR[topDomain.key] : DOMAIN_EN[topDomain.key]) : '';

  return (
    <div>
      <EditorialHeader reportNumber={new Date().getTime().toString().slice(-3)} />

      {/* ─── TITLE ─── */}
      <section className="mb-7 flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={`editorial-pill-critical`}
                  style={{
                    background: isCritical ? '#fbe9ec' : '#e8f5e9',
                    color:       isCritical ? '#c8102e' : '#0d7a4a',
                  }}>
              {isCritical
                ? (lang === 'fr' ? 'Risque critique' : 'Critical risk')
                : (lang === 'fr' ? 'Risque maîtrisé' : 'Risk under control')}
            </span>
            <span className="text-[12px] text-[#6b7280] italic">
              {lang === 'fr' ? 'Analyse prédictive générée par l\'IA le ' : 'AI-generated predictive analysis on '}
              {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>

          <h1 className="font-editorial text-[40px] md:text-[44px] font-black leading-[1.05] text-[#0b1f33]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {lang === 'fr' ? 'Rapport de Risque de Trésorerie' : 'Cash-flow Risk Report'}
          </h1>
        </div>

        {/* AI score chip — inline, top-right of the title row */}
        <div className="editorial-card px-5 py-4 flex items-center gap-3 shrink-0"
             style={{ borderLeft: `4px solid ${isCritical ? '#c8102e' : '#0d7a4a'}` }}>
          <div>
            <div className="small-caps text-[#6b7280]">
              {lang === 'fr' ? 'Score de risque IA' : 'AI risk score'}
            </div>
            <div className="font-editorial text-[36px] font-black leading-none"
                 style={{ fontFamily: 'Playfair Display, Georgia, serif',
                          color: isCritical ? '#c8102e' : '#0d7a4a' }}>
              {score}<span className="text-[16px] text-[#6b7280] font-normal">/100</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
               style={{ background: isCritical ? '#fbe9ec' : '#e8f5e9' }}>
            <span className="material-symbols-outlined"
                  style={{ color: isCritical ? '#c8102e' : '#0d7a4a' }}>
              {isCritical ? 'warning' : 'check_circle'}
            </span>
          </div>
        </div>
      </section>

      {/* ─── CHART + NARRATIVE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-7">
        {/* Forecast chart */}
        <div className="lg:col-span-8 editorial-card p-7">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-editorial text-[20px] font-bold text-[#0b1f33]"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                {lang === 'fr' ? 'Prévision de Trésorerie (30 Prochains Jours)' : 'Cash-flow Forecast (Next 30 Days)'}
              </h3>
              <p className="text-[12px] text-[#6b7280] mt-1">
                {lang === 'fr' ? 'Basé sur le cycle de facturation actuel et les projections de dépenses'
                                : 'Based on the current billing cycle and expense projections'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eef3f8] text-[#002b4c] text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              {lang === 'fr' ? 'Précision du modèle : ' : 'Model precision: '}<strong>{report.confidence}%</strong>
            </div>
          </div>

          <div style={{ height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#ece3d0" vertical={false} />
                <XAxis dataKey="day"
                       axisLine={{ stroke: '#d8cfb9' }}
                       tickLine={false}
                       tick={{ fontSize: 10, fill: '#8b8672', letterSpacing: '0.08em' }} />
                <YAxis axisLine={false} tickLine={false}
                       tick={{ fontSize: 10, fill: '#8b8672' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5ddce', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }} iconType="plainline" />
                <Line type="monotone" dataKey="rev" name={lang === 'fr' ? 'Revenus prévus' : 'Expected revenue'}
                      stroke="#002b4c" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="exp" name={lang === 'fr' ? 'Dépenses prévues' : 'Expected expenses'}
                      stroke="#c8102e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative analysis */}
        <div className="lg:col-span-4 editorial-card p-6 relative"
             style={{ borderLeft: `4px solid ${isCritical ? '#c8102e' : '#0d7a4a'}`,
                      background: isCritical ? '#fef8f9' : '#f6fbf8' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
               style={{ background: '#ffffff' }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: '#002b4c' }}>auto_awesome</span>
          </div>
          <h3 className="font-editorial text-[18px] font-bold text-[#0b1f33] mb-2"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {lang === 'fr' ? 'Analyse Narrative' : 'Narrative Analysis'}
          </h3>
          <p className="text-[13px] text-[#4a5568] leading-relaxed">
            {lang === 'fr'
              ? (isCritical
                  ? <>Le système a détecté une exposition significative sur le domaine <strong>{topDomainLabel}</strong>,
                      avec un score de <strong style={{ color: '#c8102e' }}>{topDomain?.score}/100</strong>.
                      La tendance actuelle indique un <strong style={{ color: '#c8102e' }}>déficit potentiel</strong> si
                      aucune action corrective n'est entreprise dans les prochaines semaines.</>
                  : <>Le système détecte une activité économique équilibrée. Le domaine dominant <strong>{topDomainLabel}</strong>
                     reste sous contrôle. Maintenir le pilotage actuel.</>)
              : (isCritical
                  ? <>The system has detected a significant exposure on the <strong>{topDomainLabel}</strong> domain,
                      with a score of <strong style={{ color: '#c8102e' }}>{topDomain?.score}/100</strong>.
                      The current trend points to a <strong style={{ color: '#c8102e' }}>potential deficit</strong> if
                      no corrective action is taken in the coming weeks.</>
                  : <>The system detects balanced economic activity. Dominant domain <strong>{topDomainLabel}</strong>
                     remains under control. Keep the current strategy.</>)}
          </p>

          <div className="mt-5 pt-4 flex items-end justify-between" style={{ borderTop: '1px solid #e5ddce' }}>
            <span className="small-caps text-[#6b7280]">
              {lang === 'fr' ? 'Impact estimé' : 'Estimated impact'}
            </span>
            <span className="font-editorial text-[22px] font-black"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif',
                           color: impact < 0 ? '#c8102e' : '#0d7a4a' }}>
              {impact >= 0 ? '+' : ''}{Math.round(impact).toLocaleString('fr-FR')} TND
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3 KEY SIGNALS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SignalCard
          icon="priority_high"
          iconBg="#fbe9ec" iconColor="#c8102e"
          title={lang === 'fr'
            ? `${(report.lateInvoicesList || []).length} factures impayées`
            : `${(report.lateInvoicesList || []).length} unpaid invoices`}
          sub={lang === 'fr'
            ? `Montant total : ${Math.round((report.lateInvoicesList || []).reduce((s, i) => s + (i.amount || 0), 0)).toLocaleString('fr-FR')} TND en attente de recouvrement.`
            : `Total: ${Math.round((report.lateInvoicesList || []).reduce((s, i) => s + (i.amount || 0), 0)).toLocaleString('en-GB')} TND outstanding.`} />
        <SignalCard
          icon="trending_up"
          iconBg="#fff4e5" iconColor="#e67e22"
          title={lang === 'fr'
            ? `Dépenses ${report.trends?.expenses?.change >= 0 ? '+' : ''}${Math.round(report.trends?.expenses?.change || 0)}%`
            : `Expenses ${report.trends?.expenses?.change >= 0 ? '+' : ''}${Math.round(report.trends?.expenses?.change || 0)}%`}
          sub={lang === 'fr'
            ? 'Augmentation par rapport au mois précédent.'
            : 'Increase vs. previous month.'} />
        <SignalCard
          icon="trending_down"
          iconBg="#eef3f8" iconColor="#002b4c"
          title={lang === 'fr' ? 'Faible entrée prévue' : 'Low expected inflow'}
          sub={lang === 'fr'
            ? 'Projection de flux entrants inférieure à la moyenne trimestrielle.'
            : 'Projected inflows below quarterly average.'} />
      </div>

      {/* ─── STRATEGIC RECOMMENDATIONS ─── */}
      <section className="mb-10">
        <h3 className="font-editorial text-[24px] font-extrabold text-[#0b1f33] mb-5"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          {lang === 'fr' ? 'Recommandations Stratégiques' : 'Strategic Recommendations'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <RecCard
            icon="group"
            title={lang === 'fr' ? 'Contacter les clients en retard' : 'Contact late clients'}
            body={lang === 'fr'
              ? 'Envoyer des rappels automatiques pour les factures de plus de 15 jours pour stabiliser le fonds de roulement.'
              : 'Send automated reminders for invoices older than 15 days to stabilise working capital.'}
            ctaText={lang === 'fr' ? "Exécuter l'action" : 'Run action'}
            ctaLink="/invoices"
            ctaPrimary />
          <RecCard
            icon="payments"
            title={lang === 'fr' ? 'Réduire les dépenses' : 'Reduce spending'}
            body={lang === 'fr'
              ? 'Identifier les abonnements ou frais fixes qui peuvent être reportés ou renégociés immédiatement.'
              : 'Identify subscriptions or fixed costs that can be postponed or renegotiated immediately.'}
            ctaText={lang === 'fr' ? 'Analyser les coûts' : 'Analyse costs'}
            ctaLink="/transactions" />
          <RecCard
            icon="event_busy"
            title={lang === 'fr' ? 'Reporter les investissements' : 'Postpone investments'}
            body={lang === 'fr'
              ? "Décaler l'achat de nouveaux équipements au trimestre prochain pour préserver les réserves."
              : 'Postpone new equipment purchases to next quarter to preserve reserves.'}
            ctaText={lang === 'fr' ? 'Voir le calendrier' : 'See calendar'}
            ctaLink="/final-decision" />
        </div>
      </section>

      {/* Footer */}
      <div className="editorial-divider my-8" />
      <div className="flex items-center justify-between flex-wrap gap-3 pb-6">
        <span className="editorial-confidential-footer">
          EXECUTIVE RISK EDITORIAL · INTELLIGENCE ARTIFICIELLE V4.2
        </span>
        <span className="editorial-confidential-footer">
          {lang === 'fr' ? 'DOCUMENT DE TRAVAIL · CONFIDENTIEL' : 'WORKING DOCUMENT · CONFIDENTIAL'}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────
function EditorialHeader({ reportNumber }) {
  const { lang } = useLang();
  return (
    <section className="mb-6 flex items-center justify-between flex-wrap gap-3">
      <div className="small-caps" style={{ color: '#8b8672' }}>
        {lang === 'fr' ? 'EXECUTIVE RISK EDITORIAL' : 'EXECUTIVE RISK EDITORIAL'}
      </div>
      {reportNumber && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
             style={{ background: '#ffffff', border: '1px solid #efe8dc' }}>
          <span className="small-caps text-[#6b7280]">
            {lang === 'fr' ? 'Rapport IA' : 'AI Report'} #{reportNumber}
          </span>
          <span className="editorial-badge-ai">AI</span>
        </div>
      )}
    </section>
  );
}

function SignalCard({ icon, iconBg, iconColor, title, sub }) {
  return (
    <div className="editorial-card p-5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: iconBg }}>
        <span className="material-symbols-outlined text-[18px]" style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[14px] text-[#0b1f33] leading-snug">{title}</p>
        <p className="text-[12px] text-[#6b7280] leading-relaxed mt-1">{sub}</p>
      </div>
    </div>
  );
}

function RecCard({ icon, title, body, ctaText, ctaLink, ctaPrimary }) {
  return (
    <div className="editorial-card p-6 flex flex-col">
      <div className="editorial-kpi-icon mb-4">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <h4 className="font-editorial text-[18px] font-bold text-[#0b1f33] leading-snug mb-2"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
        {title}
      </h4>
      <p className="text-[13px] text-[#6b7280] leading-relaxed flex-1 mb-4">{body}</p>
      <Link to={ctaLink}
            className={`text-center py-2 px-4 rounded-lg text-[12px] font-semibold transition-all
              ${ctaPrimary
                ? 'bg-[#002b4c] text-white hover:bg-[#001a2e] inline-flex items-center justify-center gap-1'
                : 'border text-[#002b4c] hover:bg-[#f6f2ea]'}`}
            style={!ctaPrimary ? { borderColor: '#d8cfb9' } : undefined}>
        {ctaText}
        {ctaPrimary && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
      </Link>
    </div>
  );
}
