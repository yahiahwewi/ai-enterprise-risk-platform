import { useState, useEffect } from 'react';
import api from '../services/api';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import { SkeletonKPIGrid, SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ amount: '', interestRate: '', duration: '', monthlyPayment: '' });
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/loans').then((r) => setLoans(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  const add = async (e) => { e.preventDefault(); try { const { data } = await api.post('/loans', { amount: Number(form.amount), interestRate: Number(form.interestRate), duration: Number(form.duration), monthlyPayment: Number(form.monthlyPayment) }); setLoans([data, ...loans]); setForm({ amount: '', interestRate: '', duration: '', monthlyPayment: '' }); addToast('success', t('toast.loanAdded'), `Loan of $${form.amount}`); } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); } };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('loansPage.title')}</h2></section><SkeletonKPIGrid count={3} /><SkeletonTable /></div>);

  const totalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const totalMonthly = loans.reduce((s, l) => s + l.monthlyPayment, 0);

  return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('loansPage.title')}</h2><p className="text-on-surface-variant mt-2">{t('loansPage.subtitle')}</p></section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <KPICard label={t('loansPage.totalDebt')} value={totalDebt} prefix="$" icon="credit_score" iconColor="red" />
        <KPICard label={t('loansPage.monthlyPayments')} value={totalMonthly} prefix="$" icon="payments" iconColor="yellow" />
        <KPICard label={t('loansPage.activeLoans')} value={loans.length} icon="account_balance" iconColor="blue" />
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('loansPage.add')}</h3>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={labelCls}>{t('common.amount')}</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
            <div><label className={labelCls}>{t('financeD.interestRate')}</label><input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className={inputCls} placeholder="5.5" required min="0" /></div>
            <div><label className={labelCls}>{t('financeD.duration')}</label><input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className={inputCls} placeholder="24" required min="1" /></div>
            <div><label className={labelCls}>{t('financeD.monthlyPayment')}</label><input type="number" value={form.monthlyPayment} onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('loansPage.add')}</button>
        </form>
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('loansPage.all')}</h3>
        {loans.length === 0 ? <EmptyState icon="account_balance" title={t('loansPage.noData')} message={t('loansPage.noDataMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.amount')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.interestRate')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.duration')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.monthlyPayment')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.date')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {loans.map((l) => (<tr key={l._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">${l.amount.toLocaleString()}</td><td className="py-3 text-sm text-on-surface-variant">{l.interestRate}%</td><td className="py-3 text-sm text-on-surface-variant">{l.duration}mo</td><td className="py-3 text-sm font-bold">${l.monthlyPayment.toLocaleString()}</td><td className="py-3 text-sm text-on-surface-variant">{new Date(l.createdAt).toLocaleDateString()}</td></tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
