import { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import KPICard from '../components/KPICard';
import { SkeletonKPIGrid, SkeletonChart } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

export default function Executive() {
  const [risk, setRisk] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { lang } = useLang();

  useEffect(() => {
    Promise.all([api.get('/ai/risk-report'), api.get('/ai/health-index')])
      .then(([r, h]) => { setRisk(r.data); setHealth(h.data); })
      .catch(() => addToast('error', 'Error', 'Failed'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const l = lang === 'fr' ? {
    title: 'Vue Exécutive', subtitle: 'Tableau de bord stratégique — lecture seule',
    riskScore: 'Score de Risque', healthScore: 'Santé Financière', grade: 'Grade',
    forecast30: 'Prévision 30j', forecast60: 'Prévision 60j',
    rootCauses: 'Causes Principales du Risque', cause: 'Cause', contribution: 'Contribution',
    recommendations: 'Actions Recommandées',
  } : {
    title: 'Executive View', subtitle: 'Strategic dashboard — read only',
    riskScore: 'Risk Score', healthScore: 'Financial Health', grade: 'Grade',
    forecast30: '30-Day Forecast', forecast60: '60-Day Forecast',
    rootCauses: 'Top Risk Causes', cause: 'Cause', contribution: 'Contribution',
    recommendations: 'Recommended Actions',
  };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{l.title}</h2></section><SkeletonKPIGrid count={4} /><SkeletonChart /></div>);
  if (!risk || !health) return <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant">No data.</div>;

  const riskColor = risk.level === 'critical' ? '#ba1a1a' : risk.level === 'high' ? '#e67e22' : risk.level === 'moderate' ? '#d97706' : '#0d9e6e';
  const healthColor = health.grade === 'A' ? '#0d9e6e' : health.grade === 'B' ? '#22c55e' : health.grade === 'C' ? '#d97706' : health.grade === 'D' ? '#e67e22' : '#ba1a1a';

  const radarData = Object.entries(risk.breakdown).map(([k, v]) => ({ metric: k.replace(/([A-Z])/g, ' $1').trim(), score: v.score }));

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{l.title}</h2>
        <p className="text-on-surface-variant mt-2">{l.subtitle}</p>
      </section>

      {/* Hero: Risk + Health gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 executive-gradient" />
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">{l.riskScore}</h3>
          <div className="relative w-36 h-36 mx-auto mb-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="60" fill="transparent" stroke="#e6e8ea" strokeWidth="8" />
              <circle cx="70" cy="70" r="60" fill="transparent" stroke={riskColor} strokeWidth="8" strokeDasharray={2*Math.PI*60} strokeDashoffset={2*Math.PI*60*(1-risk.globalScore/100)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold font-headline">{risk.globalScore}</span>
              <span className="text-xs text-on-surface-variant">/100</span>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: riskColor + '15', color: riskColor }}>{risk.level}</span>
        </div>

        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: healthColor }} />
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">{l.healthScore}</h3>
          <div className="text-6xl font-extrabold font-headline mb-2" style={{ color: healthColor }}>{health.grade}</div>
          <div className="text-2xl font-bold text-on-surface dark:text-slate-100">{health.score}/100</div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {Object.entries(health.dimensions).map(([k, v]) => (
              <div key={k} className="bg-surface-container-low dark:bg-slate-700 rounded-lg p-2">
                <span className="text-on-surface-variant capitalize">{k}</span>
                <div className="font-bold text-on-surface dark:text-slate-200">{v.score}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Risk Radar</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e6e8ea" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#42474f' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#727780' }} />
                <Radar dataKey="score" stroke="#0f4c81" fill="#0f4c81" fillOpacity={0.15} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard label={l.forecast30} value={risk.forecast.forecast30Days} suffix=" TND" icon="calendar_month" iconColor={risk.forecast.forecast30Days >= 0 ? 'green' : 'red'} />
        <KPICard label={l.forecast60} value={risk.forecast.forecast60Days} suffix=" TND" icon="date_range" iconColor={risk.forecast.forecast60Days >= 0 ? 'green' : 'red'} />
        <KPICard label={lang === 'fr' ? 'Revenus 30j' : 'Income 30d'} value={risk.trends.income.current} suffix=" TND" trend={risk.trends.income.change} icon="trending_up" iconColor="green" />
        <KPICard label={lang === 'fr' ? 'Dépenses 30j' : 'Expenses 30d'} value={risk.trends.expenses.current} suffix=" TND" trend={risk.trends.expenses.change} icon="trending_down" iconColor="red" />
      </div>

      {/* Root Causes */}
      {risk.rootCauses && risk.rootCauses.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{l.rootCauses}</h3>
          <div className="space-y-2">
            {risk.rootCauses.map((rc, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-surface-container-low dark:bg-slate-700/50 rounded-xl">
                <span className="text-sm font-bold text-on-surface dark:text-slate-200 flex-1">{rc.cause}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${rc.contribution >= 15 ? 'bg-red-100 text-red-700' : rc.contribution >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  +{rc.contribution} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{l.recommendations}</h3>
        <div className="space-y-2">
          {risk.recommendations.map((text, i) => (
            <div key={i} className="border-l-4 border-green-400 bg-green-50 dark:bg-green-900/10 p-3 rounded-r-xl text-sm text-green-700 dark:text-green-400">{text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
