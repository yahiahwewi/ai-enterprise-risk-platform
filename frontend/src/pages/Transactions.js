import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import ComboInput from '../components/ComboInput';
import { SkeletonKPIGrid, SkeletonChart } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'income', amount: '', category: '', description: '' });
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/transactions').then((r) => setTransactions(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  const add = async (e) => {
    e.preventDefault();
    try { const { data } = await api.post('/transactions', { ...form, amount: Number(form.amount) }); setTransactions([data, ...transactions]); setForm({ type: 'income', amount: '', category: '', description: '' }); addToast('success', t('toast.transactionAdded'), `${form.type} of ${form.amount} TND`); }
    catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); }
  };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('transactions.title')}</h2></section><SkeletonKPIGrid count={3} /><SkeletonChart /></div>);

  const catMap = {};
  transactions.forEach((tx) => { if (!catMap[tx.category]) catMap[tx.category] = { category: tx.category, income: 0, expense: 0 }; catMap[tx.category][tx.type] += tx.amount; });
  const chartData = Object.values(catMap);

  return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('transactions.title')}</h2><p className="text-on-surface-variant mt-2">{t('transactions.subtitle')}</p></section>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('transactions.add')}</h3>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={labelCls}>{t('accountant.type')}</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="income">{t('accountant.income')}</option><option value="expense">{t('accountant.expense')}</option></select></div>
            <div><label className={labelCls}>{t('common.amount')}</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
            <div><label className={labelCls}>{t('accountant.category')}</label><ComboInput value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={[...new Set(transactions.map((t) => t.category).filter(Boolean))]} placeholder={t('accountant.selectCategory')} label="category" required /></div>
            <div><label className={labelCls}>{t('accountant.description')}</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Optional" /></div>
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('transactions.add')}</button>
        </form>
      </div>

      {chartData.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 mb-10">
          <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('transactions.incomeVsExpenses')}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}><XAxis dataKey="category" tick={{ fontSize: 11, fill: '#42474f' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#727780' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} formatter={(v) => `${v.toLocaleString()} TND`} /><Legend /><Bar dataKey="income" name={t('accountant.income')} fill="#22c55e" radius={[6, 6, 0, 0]} /><Bar dataKey="expense" name={t('accountant.expense')} fill="#ba1a1a" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('transactions.all')}</h3>
        {transactions.length === 0 ? <EmptyState icon="receipt_long" title={t('transactions.noData')} message={t('transactions.noDataMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.date')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.type')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.category')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.description')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 text-right">{t('common.amount')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {transactions.map((tx) => (<tr key={tx._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm text-on-surface dark:text-slate-300">{new Date(tx.date).toLocaleDateString()}</td><td className="py-3"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tx.type}</span></td><td className="py-3 text-sm">{tx.category}</td><td className="py-3 text-sm text-on-surface-variant">{tx.description || '—'}</td><td className="py-3 text-sm font-bold text-right">{tx.amount.toLocaleString()} TND</td></tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
