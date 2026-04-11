import { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import api from '../services/api';
import KPICard from '../components/KPICard';
import { SkeletonKPIGrid, SkeletonChart } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

export default function RiskReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/ai/risk-report').then((r) => setReport(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('riskReport.title')}</h2></section><SkeletonKPIGrid count={4} /><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><SkeletonChart /><SkeletonChart /></div></div>);
  if (!report) return <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-on-surface-variant">No data.</div>;

  const radarData = Object.entries(report.breakdown).map(([k, v]) => ({ metric: k.replace(/([A-Z])/g, ' $1').trim(), score: v.score }));
  const trendChart = [{ name: t('riskReport.totalIncome'), current: report.trends.income.current, previous: report.trends.income.previous }, { name: t('riskReport.totalExpenses'), current: report.trends.expenses.current, previous: report.trends.expenses.previous }];
  const riskColor = report.level === 'critical' ? '#ba1a1a' : report.level === 'high' ? '#e67e22' : report.level === 'moderate' ? '#d97706' : '#0d9e6e';

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('riskReport.title')}</h2>
        <p className="text-on-surface-variant mt-2">{t('riskReport.subtitle')}</p>
      </section>

      {/* Score + Radar Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        <div className="lg:col-span-4 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 executive-gradient" />
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">{t('riskReport.globalScore')}</h3>
          <div className="relative w-44 h-44 mb-4 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="84" fill="transparent" stroke="#e6e8ea" strokeWidth="10" />
              <circle cx="96" cy="96" r="84" fill="transparent" stroke={riskColor} strokeWidth="10" strokeDasharray={2 * Math.PI * 84} strokeDashoffset={2 * Math.PI * 84 * (1 - report.globalScore / 100)} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-extrabold font-headline text-on-surface dark:text-slate-100">{report.globalScore}<span className="text-xl text-on-surface-variant font-medium">/100</span></span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full mt-2 ${report.level === 'critical' ? 'bg-error-container text-on-error-container' : report.level === 'high' ? 'bg-orange-100 text-orange-700' : report.level === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{report.level.charAt(0).toUpperCase() + report.level.slice(1)} Risk</span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">Confidence: <strong>{report.confidence}%</strong></p>
        </div>
        <div className="lg:col-span-8 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
          <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('riskReport.riskRadar')}</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}><PolarGrid stroke="#e6e8ea" /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#42474f' }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#727780' }} /><Radar dataKey="score" stroke="#0f4c81" fill="#0f4c81" fillOpacity={0.15} /><Tooltip /></RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Risk domain cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Object.entries(report.breakdown).map(([k, v]) => {
          const level = v.score >= 75 ? 'critical' : v.score >= 50 ? 'high' : v.score >= 25 ? 'moderate' : 'low';
          const icons = { cashFlow: 'account_balance_wallet', invoices: 'description', debt: 'credit_score', loanBurden: 'savings' };
          return <KPICard key={k} label={`${k.replace(/([A-Z])/g, ' $1').trim()} (${v.weight})`} value={`${v.score}/100`} icon={icons[k] || 'assessment'} iconColor={level === 'critical' || level === 'high' ? 'red' : level === 'moderate' ? 'yellow' : 'green'} progress={v.score} />;
        })}
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="grid grid-cols-2 gap-4">
          <KPICard label={t('riskReport.totalIncome')} value={report.trends.income.current} suffix=" TND" trend={report.trends.income.change} trendLabel="vs prev" icon="trending_up" iconColor="green" />
          <KPICard label={t('riskReport.totalExpenses')} value={report.trends.expenses.current} suffix=" TND" trend={report.trends.expenses.change} trendLabel="vs prev" icon="trending_down" iconColor="red" />
        </div>
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('riskReport.periodComparison')}</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChart} barSize={28}><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#42474f' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#727780' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} formatter={(v) => `${v.toLocaleString()} TND`} /><Legend /><Bar dataKey="previous" name={t('riskReport.prev30d')} fill="#c2c7d1" radius={[6, 6, 0, 0]} /><Bar dataKey="current" name={t('riskReport.last30d')} fill="#0f4c81" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard label={t('riskReport.forecast30')} value={report.forecast.forecast30Days} suffix=" TND" icon="calendar_month" iconColor="blue" />
        <KPICard label={t('riskReport.forecast60')} value={report.forecast.forecast60Days} suffix=" TND" icon="date_range" iconColor="blue" />
        <KPICard label={t('riskReport.pendingInvoices')} value={report.forecast.breakdown.pendingInvoiceInflow30} suffix=" TND" icon="move_to_inbox" iconColor="green" />
        <KPICard label={t('riskReport.loanPayments')} value={report.forecast.breakdown.monthlyLoanPayments} suffix=" TND" icon="savings" iconColor="yellow" />
      </div>

      {/* Anomalies */}
      {report.anomalies.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('riskReport.anomalies')} ({report.anomalies.length})</h3>
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.category')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.type')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.amount')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">Expected</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">Deviation</th></tr></thead><tbody className="divide-y divide-surface-container-high">
            {report.anomalies.map((a, i) => (<tr key={i}><td className="py-3 text-sm">{a.category}</td><td className="py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.type}</span></td><td className="py-3 text-sm font-bold">{a.amount.toLocaleString()} TND</td><td className="py-3 text-sm text-on-surface-variant">{a.mean.toLocaleString()} TND</td><td className="py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{a.deviations}x</span></td></tr>))}
          </tbody></table></div>
        </div>
      )}

      {/* Alerts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {report.explanations.slice(0, 1).map((text, i) => (
          <div key={i} className="bg-surface-container-lowest dark:bg-slate-800 border-l-4 border-error p-6 rounded-r-xl shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-bold text-error uppercase tracking-widest">Analysis</span>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-2">{text}</p>
          </div>
        ))}
        {report.predictions.slice(0, 1).map((text, i) => (
          <div key={i} className="bg-surface-container-lowest dark:bg-slate-800 border-l-4 border-orange-400 p-6 rounded-r-xl shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Prediction</span>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-2">{text}</p>
          </div>
        ))}
        {report.recommendations.slice(0, 1).map((text, i) => (
          <div key={i} className="bg-surface-container-lowest dark:bg-slate-800 border-l-4 border-green-400 p-6 rounded-r-xl shadow-sm hover:shadow-md transition-all">
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Recommendation</span>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-2">{text}</p>
          </div>
        ))}
      </div>

      {/* Metrics summary */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-6">{t('riskReport.financialMetrics')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[[t('riskReport.totalIncome'), report.metrics.totalIncome], [t('riskReport.totalExpenses'), report.metrics.totalExpenses], [t('riskReport.cashFlow'), report.metrics.cashFlow], [t('riskReport.unpaidInvoices'), report.metrics.unpaidInvoices], [t('riskReport.totalDebt'), report.metrics.totalDebt], [t('riskReport.totalAssets'), report.metrics.totalAssetValue]].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-lg font-bold font-headline ${label === t('riskReport.cashFlow') && val < 0 ? 'text-error' : 'text-on-surface dark:text-slate-100'}`}>{val.toLocaleString()} TND</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
