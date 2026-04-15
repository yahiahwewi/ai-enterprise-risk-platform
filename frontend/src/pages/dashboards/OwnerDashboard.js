import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import KPICard from '../../components/KPICard';
import { SkeletonKPIGrid, SkeletonChart } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

const COLORS = ['#0d9e6e', '#d97706', '#e67e22', '#ba1a1a'];

// ── Dev Scenario Panel ─────────────────────────────────────────────────────
function DevScenarioPanel({ onRefresh }) {
  const [open, setOpen]       = useState(false);
  const [seeding, setSeeding] = useState(null); // 'good' | 'bad' | null
  const [confirm, setConfirm] = useState(null); // 'good' | 'bad' | null
  const { addToast } = useToast();
  const { lang } = useLang();

  const seed = async (scenario) => {
    setConfirm(null);
    setSeeding(scenario);
    try {
      const res = await api.post(`/dev/seed/${scenario}`);
      addToast('success',
        scenario === 'good'
          ? (lang === 'fr' ? '✅ Bon scénario chargé' : '✅ Good scenario loaded')
          : (lang === 'fr' ? '⚠️ Mauvais scénario chargé' : '⚠️ Bad scenario loaded'),
        res.data.message
      );
      await onRefresh();
    } catch (err) {
      addToast('error', 'Erreur', err.response?.data?.message || err.message);
    } finally {
      setSeeding(null);
    }
  };

  const scenarios = {
    good: {
      label:   lang === 'fr' ? 'Bon Scénario' : 'Good Scenario',
      desc:    lang === 'fr' ? 'Score attendu : ~15-20 · Niveau : Faible' : 'Expected score: ~15-20 · Level: Low',
      detail:  lang === 'fr'
        ? '36 transactions saines · 15 factures (10 payées, 3 en attente, 2 en retard) · 1 prêt gérable · 4 actifs'
        : '36 healthy transactions · 15 invoices (10 paid, 3 pending, 2 late) · 1 manageable loan · 4 assets',
      icon:    'trending_up',
      color:   '#0d9e6e',
      bg:      '#e8f5e9',
      border:  '#0d9e6e',
      btnCls:  'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    bad: {
      label:   lang === 'fr' ? 'Mauvais Scénario' : 'Bad Scenario',
      desc:    lang === 'fr' ? 'Score attendu : ~88-95 · Niveau : Critique' : 'Expected score: ~88-95 · Level: Critical',
      detail:  lang === 'fr'
        ? '30 transactions déficitaires · 20 factures (18 en retard, montants élevés) · 2 prêts lourds · 0 actif'
        : '30 deficit transactions · 20 invoices (18 late, large amounts) · 2 heavy loans · 0 assets',
      icon:    'trending_down',
      color:   '#ba1a1a',
      bg:      '#ffebee',
      border:  '#ba1a1a',
      btnCls:  'bg-red-600 hover:bg-red-700 text-white',
    },
  };

  return (
    <div className="mb-10">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-100 transition-all"
      >
        <span className="material-symbols-outlined text-base">science</span>
        {lang === 'fr' ? 'Options de développement — Scénarios de test' : 'Dev Options — Test Scenarios'}
        <span className="material-symbols-outlined text-base ml-auto transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {Object.entries(scenarios).map(([key, s]) => (
            <div
              key={key}
              className="rounded-xl border-2 p-6 flex flex-col gap-4 transition-all"
              style={{ borderColor: s.border, background: s.bg + '33' }}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: s.bg }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: s.color }}>{s.icon}</span>
                </div>
                <div>
                  <p className="font-extrabold text-on-surface dark:text-slate-100 text-base">{s.label}</p>
                  <p className="text-xs font-semibold" style={{ color: s.color }}>{s.desc}</p>
                </div>
              </div>

              {/* Detail */}
              <p className="text-xs text-on-surface-variant leading-relaxed border-l-2 pl-3" style={{ borderColor: s.border }}>
                {s.detail}
              </p>

              {/* Action */}
              {confirm === key ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => seed(key)}
                    disabled={seeding !== null}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${s.btnCls}`}
                  >
                    {seeding === key ? (
                      <><span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>{lang === 'fr' ? 'Chargement...' : 'Loading...'}</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm">check</span>{lang === 'fr' ? 'Confirmer' : 'Confirm'}</>
                    )}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm(key)}
                  disabled={seeding !== null}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${s.btnCls} disabled:opacity-50`}
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  {lang === 'fr' ? `Charger le ${s.label.toLowerCase()}` : `Load ${s.label}`}
                </button>
              )}

              {/* Warning */}
              <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-amber-500">warning</span>
                {lang === 'fr' ? 'Toutes les données existantes seront supprimées.' : 'All existing data will be deleted.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t } = useLang();

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

  useEffect(() => { fetchReport(); }, [fetchReport]);

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">{t('dashboard.strategic')}</h2><p className="text-on-surface-variant mt-2">{t('common.loading')}</p></section><SkeletonKPIGrid count={4} /><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><SkeletonChart /><SkeletonChart /></div></div>);
  if (!report) return <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant">{t('common.noData')}</div>;

  const breakdownData = Object.entries(report.breakdown).map(([key, val]) => ({ name: key.replace(/([A-Z])/g, ' $1').trim(), score: val.score }));
  const pieData = breakdownData.map((d) => ({ name: d.name, value: d.score }));
  const riskColor = report.level === 'critical' ? '#ba1a1a' : report.level === 'high' ? '#e67e22' : report.level === 'moderate' ? '#d97706' : '#0d9e6e';
  const riskLabel = t(`dashboard.${report.level}Risk`);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('dashboard.strategic')}</h2>
        <p className="text-on-surface-variant mt-2">{t('dashboard.strategicDesc')}</p>
      </section>

      {/* ── Dev scenario panel ── */}
      <DevScenarioPanel onRefresh={fetchReport} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden border border-transparent hover:border-outline-variant/15 transition-all">
          <div className="absolute top-0 left-0 w-full h-1 executive-gradient" />
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">{t('dashboard.globalRiskScore')}</h3>
          <div className="relative w-44 h-44 mb-4 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="84" fill="transparent" stroke="#e6e8ea" strokeWidth="10" />
              <circle cx="96" cy="96" r="84" fill="transparent" stroke={riskColor} strokeWidth="10" strokeDasharray={2 * Math.PI * 84} strokeDashoffset={2 * Math.PI * 84 * (1 - report.globalScore / 100)} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-extrabold font-headline text-on-surface dark:text-slate-100 tracking-tighter">{report.globalScore}<span className="text-xl text-on-surface-variant font-medium">/100</span></span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full mt-2 ${report.level === 'critical' ? 'bg-error-container text-on-error-container' : report.level === 'high' ? 'bg-orange-100 text-orange-700' : report.level === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{riskLabel}</span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant max-w-[220px]">{t('common.confidence')}: {report.confidence}%</p>
        </div>

        <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div><h3 className="text-lg font-bold text-on-surface dark:text-slate-100 font-headline">{t('dashboard.riskBreakdown')}</h3><p className="text-sm text-on-surface-variant">{t('dashboard.riskByDomain')}</p></div>
            <Link to="/risk-report" className="text-primary text-sm font-bold hover:underline">{t('dashboard.fullReport')}</Link>
          </div>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} barSize={36}><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#42474f' }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#727780' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} /><Bar dataKey="score" fill="#0f4c81" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h3 className="text-xl font-bold font-headline mb-6 text-on-surface dark:text-slate-100">{t('dashboard.riskDomains')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(report.breakdown).map(([key, val]) => {
            const icons = { cashFlow: 'account_balance_wallet', invoices: 'description', debt: 'credit_score', loanBurden: 'savings' };
            const level = val.score >= 75 ? 'critical' : val.score >= 50 ? 'high' : val.score >= 25 ? 'moderate' : 'low';
            return <KPICard key={key} label={key.replace(/([A-Z])/g, ' $1').trim() + ` (${val.weight})`} value={val.score} icon={icons[key] || 'assessment'} iconColor={level === 'critical' || level === 'high' ? 'red' : level === 'moderate' ? 'yellow' : 'green'} progress={val.score} />;
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard label={t('dashboard.income30d')} value={report.trends.income.current} suffix=" TND" trend={report.trends.income.change} trendLabel={t('common.prev30d')} icon="trending_up" iconColor="green" />
        <KPICard label={t('dashboard.expenses30d')} value={report.trends.expenses.current} suffix=" TND" trend={report.trends.expenses.change} trendLabel={t('common.prev30d')} icon="trending_down" iconColor="red" />
        <KPICard label={t('dashboard.forecast30d')} value={report.forecast.forecast30Days} suffix=" TND" icon="calendar_month" iconColor="blue" insight={t('dashboard.projectedCashFlow')} />
        <KPICard label={t('dashboard.forecast60d')} value={report.forecast.forecast60Days} suffix=" TND" icon="date_range" iconColor="blue" insight={t('dashboard.extendedProjection')} />
      </div>

      {report.anomalies.length > 0 && (
        <div className="border-l-4 border-orange-400 bg-surface-container-lowest dark:bg-slate-800 p-4 rounded-r-xl shadow-sm mb-10">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{t('dashboard.anomalyDetected')}</span>
          <p className="text-sm text-on-surface-variant mt-1">{report.anomalies.length} {t('dashboard.anomalyMsg')} <Link to="/final-decision" className="text-primary font-bold hover:underline">{t('dashboard.reviewDetails')}</Link></p>
        </div>
      )}

      <section>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-fixed dark:bg-blue-900/30 rounded-lg"><span className="material-symbols-outlined text-primary filled">auto_awesome</span></div>
            <h3 className="text-xl font-bold font-headline text-on-surface dark:text-slate-100">{t('dashboard.aiAlerts')}</h3>
          </div>
          <Link to="/final-decision" className="text-primary font-bold text-sm hover:underline">{t('dashboard.viewAiDecision')}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {report.explanations.slice(0, 1).map((text, i) => (
            <div key={`e-${i}`} className="bg-surface-container-lowest dark:bg-slate-800 border-l-4 border-error p-6 rounded-r-xl shadow-sm hover:shadow-md transition-all">
              <span className="text-[10px] font-bold text-error uppercase tracking-widest">{t('dashboard.analysis')}</span>
              <h4 className="font-bold text-on-surface dark:text-slate-200 mb-2 text-sm mt-2">{t('dashboard.riskAssessment')}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{text}</p>
              <Link to="/risk-report" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg inline-block hover:opacity-90">{t('common.viewDetails')}</Link>
            </div>
          ))}
          {report.predictions.slice(0, 1).map((text, i) => (
            <div key={`p-${i}`} className="bg-surface-container-lowest dark:bg-slate-800 border-l-4 border-orange-400 p-6 rounded-r-xl shadow-sm hover:shadow-md transition-all">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{t('dashboard.prediction')}</span>
              <h4 className="font-bold text-on-surface dark:text-slate-200 mb-2 text-sm mt-2">{t('dashboard.prediction')}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{text}</p>
              <Link to="/final-decision" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg inline-block hover:opacity-90">{t('common.simulate')}</Link>
            </div>
          ))}
          {report.recommendations.slice(0, 1).map((text, i) => (
            <div key={`r-${i}`} className="bg-surface-container-lowest dark:bg-slate-800 border-l-4 border-blue-400 p-6 rounded-r-xl shadow-sm hover:shadow-md transition-all">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{t('dashboard.recommendation')}</span>
              <h4 className="font-bold text-on-surface dark:text-slate-200 mb-2 text-sm mt-2">{t('dashboard.actionItem')}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{text}</p>
              <Link to="/final-decision" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg inline-block hover:opacity-90">{t('common.actNow')}</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
