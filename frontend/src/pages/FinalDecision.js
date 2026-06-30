import { useState, useEffect } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../services/api';
import { SkeletonKPIGrid, SkeletonChart } from '../components/Skeleton';
import KPICard from '../components/KPICard';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const decisionStyles = {
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  red: 'bg-error-container text-on-error-container border-red-200',
};
const urgencyBadge = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

export default function FinalDecision({ embedded = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t, lang } = useLang();

  useEffect(() => {
    api
      .get('/ai/final-decision')
      .then((r) => setData(r.data))
      .catch(() => addToast('error', t('toast.error'), 'Failed'))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  if (loading)
    return (
      <div>
        <section className="mb-10">
          <h2 className="text-3xl font-extrabold font-headline">{t('decision.title')}</h2>
        </section>
        <SkeletonKPIGrid count={4} />
        <SkeletonChart />
      </div>
    );
  if (!data)
    return (
      <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant">
        No data available.
      </div>
    );

  const { decision, decisionColor, summary, priorityActions, businessImpact, riskReport } = data;
  const { breakdown, trends, anomalies, forecast, confidence } = riskReport;
  const radarData = Object.entries(breakdown).map(([k, v]) => ({
    metric: k.replace(/([A-Z])/g, ' $1').trim(),
    score: v.score,
  }));
  const riskColor =
    riskReport.level === 'critical'
      ? '#ba1a1a'
      : riskReport.level === 'high'
        ? '#e67e22'
        : riskReport.level === 'moderate'
          ? '#d97706'
          : '#0d9e6e';

  return (
    <div>
      <section
        className={
          embedded
            ? 'mb-6 flex justify-between items-center'
            : 'mb-10 flex justify-between items-start'
        }
      >
        <div>
          <h2
            className={
              embedded
                ? 'text-xl font-bold font-headline tracking-tight text-on-surface dark:text-slate-100 flex items-center gap-2'
                : 'text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100'
            }
          >
            {embedded && <span className="material-symbols-outlined text-primary">gavel</span>}
            {t('decision.title')}
          </h2>
          {!embedded && <p className="text-on-surface-variant mt-2">{t('decision.subtitle')}</p>}
        </div>
        <button
          onClick={() => {
            api
              .post(`/export/pdf/generate?type=decision&language=${lang}`)
              .then(() =>
                addToast(
                  'success',
                  lang === 'fr' ? 'Rapport généré' : 'Report generated',
                  lang === 'fr' ? 'Disponible dans Rapports PDF' : 'Available in PDF Reports'
                )
              )
              .catch(() => addToast('error', t('toast.error'), t('toast.failed')));
          }}
          className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
          {lang === 'fr' ? 'Exporter PDF' : 'Export PDF'}
        </button>
      </section>

      {/* Decision + Score Hero — hidden when embedded; the dashboard shows its own banner */}
      {!embedded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 executive-gradient" />
            <div className="p-2 bg-primary-fixed dark:bg-blue-900/30 rounded-lg mb-4">
              <span className="material-symbols-outlined text-primary filled">auto_awesome</span>
            </div>
            <span
              className={`text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-6 ${decisionStyles[decisionColor] || decisionStyles.yellow}`}
            >
              {decision}
            </span>
            <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="transparent"
                  stroke="#e6e8ea"
                  strokeWidth="10"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="transparent"
                  stroke={riskColor}
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - riskReport.globalScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold font-headline text-on-surface dark:text-slate-100">
                  {riskReport.globalScore}
                </span>
                <span className="text-xs text-on-surface-variant">/100</span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">
              AI Confidence: <strong>{confidence}%</strong>
            </p>
          </div>

          <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-primary-fixed dark:bg-blue-900/30 rounded-lg">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  summarize
                </span>
              </div>
              <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100">
                {t('decision.executiveSummary')}
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{summary}</p>
            <div
              className={`border-l-4 p-4 rounded-r-xl text-sm leading-relaxed ${riskReport.globalScore >= 50 ? 'border-error bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400' : riskReport.globalScore >= 25 ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400' : 'border-green-400 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'}`}
            >
              <strong>{t('decision.businessImpact')}: </strong>
              {businessImpact}
            </div>
          </div>
        </div>
      )}

      {/* Priority Actions */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 mb-10">
        <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100 mb-6">
          {t('decision.priorityActions')}
        </h3>
        <div className="space-y-3">
          {priorityActions.map((a) => (
            <div
              key={a.priority}
              className="flex gap-4 p-4 bg-surface-container-low dark:bg-slate-700/50 rounded-xl hover:translate-x-1 transition-transform"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${urgencyBadge[a.urgency] || urgencyBadge.medium}`}
              >
                {a.priority}
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface dark:text-slate-200 mb-0.5">
                  {a.action}
                </h4>
                <p className="text-xs text-on-surface-variant">{a.impact}</p>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 inline-block ${a.urgency === 'critical' ? 'text-error' : a.urgency === 'high' ? 'text-orange-600' : 'text-on-surface-variant'}`}
                >
                  {a.urgency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard
          label={t('riskReport.totalIncome')}
          value={trends.income.current}
          suffix=" TND"
          trend={trends.income.change}
          trendLabel="vs prev"
          icon="trending_up"
          iconColor="green"
        />
        <KPICard
          label={t('riskReport.totalExpenses')}
          value={trends.expenses.current}
          suffix=" TND"
          trend={trends.expenses.change}
          trendLabel="vs prev"
          icon="trending_down"
          iconColor="red"
        />
        <KPICard
          label={t('riskReport.forecast30')}
          value={forecast.forecast30Days}
          suffix=" TND"
          icon="calendar_month"
          iconColor="blue"
        />
        <KPICard
          label={t('riskReport.forecast60')}
          value={forecast.forecast60Days}
          suffix=" TND"
          icon="date_range"
          iconColor="blue"
        />
      </div>

      {/* Radar + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {t('decision.riskRadar')}
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e6e8ea" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#42474f' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#727780' }} />
                <Radar dataKey="score" stroke="#0f4c81" fill="#0f4c81" fillOpacity={0.15} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {t('decision.riskBreakdown')}
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radarData} barSize={36}>
                <XAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: '#42474f' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#727780' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} />
                <Bar dataKey="score" fill="#0f4c81" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {t('decision.anomaliesDetected')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('accountant.category')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('accountant.type')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('common.amount')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    Expected
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    Deviation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
                {anomalies.map((a, i) => (
                  <tr key={i}>
                    <td className="py-3 text-sm">{a.category}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td className="py-3 text-sm font-bold">{a.amount.toLocaleString()} TND</td>
                    <td className="py-3 text-sm text-on-surface-variant">
                      {a.mean.toLocaleString()} TND
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {a.deviations}x ({a.direction})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
          {t('decision.recommendations')}
        </h3>
        <div className="space-y-2">
          {riskReport.recommendations.map((rec, i) => (
            <div
              key={i}
              className="border-l-4 border-green-400 bg-green-50 dark:bg-green-900/10 p-4 rounded-r-xl text-sm text-green-700 dark:text-green-400 leading-relaxed"
            >
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
