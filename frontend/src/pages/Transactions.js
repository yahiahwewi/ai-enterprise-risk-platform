import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../services/api';
import KPICard from '../components/KPICard';
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
  const [typeFilter, setTypeFilter] = useState('');
  const [deleting, setDeleting] = useState(null);
  const { addToast } = useToast();
  const { t, lang } = useLang();

  const fetchTransactions = () => {
    const params = typeFilter ? `?type=${typeFilter}` : '';
    api.get(`/transactions${params}`).then((r) => setTransactions(r.data)).catch(() => addToast('error', t('toast.error'), t('toast.failed'))).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransactions(); }, [typeFilter]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/transactions', { ...form, amount: Number(form.amount) });
      setTransactions([data, ...transactions]);
      setForm({ type: 'income', amount: '', category: '', description: '' });
      addToast('success', t('toast.transactionAdded'), `${form.amount} TND`);
    } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || t('toast.failed')); }
  };

  const deleteTransaction = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions(transactions.filter((tx) => tx._id !== id));
      setDeleting(null);
      addToast('success', lang === 'fr' ? 'Transaction supprimée' : 'Transaction deleted', '');
    } catch { addToast('error', t('toast.error'), t('toast.failed')); }
  };

  const filterLabels = { fr: { all: 'Toutes', income: 'Revenus', expense: 'Dépenses' }, en: { all: 'All', income: 'Income', expense: 'Expenses' } };
  const fl = filterLabels[lang] || filterLabels.fr;

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('transactions.title')}</h2></section><SkeletonKPIGrid count={3} /><SkeletonChart /></div>);

  const totalIncome = transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

  const catMap = {};
  transactions.forEach((tx) => { if (!catMap[tx.category]) catMap[tx.category] = { category: tx.category, income: 0, expense: 0 }; catMap[tx.category][tx.type] += tx.amount; });
  const chartData = Object.values(catMap);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('transactions.title')}</h2>
        <p className="text-on-surface-variant mt-2">{t('transactions.subtitle')}</p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <KPICard label={t('accountant.totalIncome')} value={totalIncome} suffix=" TND" icon="trending_up" iconColor="green" />
        <KPICard label={t('accountant.totalExpenses')} value={totalExpenses} suffix=" TND" icon="trending_down" iconColor="red" />
        <KPICard label={lang === 'fr' ? 'Solde net' : 'Net Balance'} value={totalIncome - totalExpenses} suffix=" TND" icon="account_balance_wallet" iconColor={totalIncome - totalExpenses >= 0 ? 'green' : 'red'} />
      </div>

      {/* Create form */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('transactions.add')}</h3>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={labelCls}>{t('accountant.type')}</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="income">{t('accountant.income')}</option><option value="expense">{t('accountant.expense')}</option></select></div>
            <div><label className={labelCls}>{t('common.amount')} (TND)</label><input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.000" required min="0" /></div>
            <div><label className={labelCls}>{t('accountant.category')}</label><ComboInput value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={[...new Set(transactions.map((tx) => tx.category).filter(Boolean))]} placeholder={t('accountant.selectCategory')} label="category" required /></div>
            <div><label className={labelCls}>{t('accountant.description')}</label><input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder={t('accountant.optional')} /></div>
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('transactions.add')}</button>
        </form>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 mb-10">
          <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('transactions.incomeVsExpenses')}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#42474f' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#727780' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} formatter={(v) => `${v.toLocaleString()} TND`} />
                <Legend />
                <Bar dataKey="income" name={t('accountant.income')} fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name={t('accountant.expense')} fill="#ba1a1a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transaction list with filters */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100">{t('transactions.all')}</h3>
          <div className="flex gap-1">
            {[['', fl.all], ['income', fl.income], ['expense', fl.expense]].map(([val, label]) => (
              <button key={val} onClick={() => setTypeFilter(val)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${typeFilter === val ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 ? (
          <EmptyState icon="receipt_long" title={t('transactions.noData')} message={t('transactions.noDataMsg')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.date')}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.type')}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.category')}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.description')}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 text-right">{t('common.amount')}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 text-sm text-on-surface dark:text-slate-300">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="py-3"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tx.type}</span></td>
                    <td className="py-3 text-sm">{tx.category}</td>
                    <td className="py-3 text-sm text-on-surface-variant">{tx.description || '—'}</td>
                    <td className="py-3 text-sm font-bold text-right">{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</td>
                    <td className="py-3">
                      {deleting === tx._id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteTransaction(tx._id)} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-red-200 transition-colors">
                            {lang === 'fr' ? 'Confirmer' : 'Confirm'}
                          </button>
                          <button onClick={() => setDeleting(null)} className="text-xs text-on-surface-variant hover:text-on-surface px-1">
                            {lang === 'fr' ? 'Non' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleting(tx._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded" title={lang === 'fr' ? 'Supprimer' : 'Delete'}>
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
