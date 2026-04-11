import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import ComboInput from '../../components/ComboInput';
import { SkeletonKPIGrid, SkeletonChart } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

export default function FinanceDashboard() {
  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loanForm, setLoanForm] = useState({ amount: '', interestRate: '', duration: '', monthlyPayment: '' });
  const [assetForm, setAssetForm] = useState({ name: '', value: '', depreciationRate: '' });
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => {
    Promise.all([api.get('/loans'), api.get('/assets')])
      .then(([l, a]) => { setLoans(l.data); setAssets(a.data); })
      .catch(() => addToast('error', t('toast.error'), 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  const addLoan = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/loans', { amount: Number(loanForm.amount), interestRate: Number(loanForm.interestRate), duration: Number(loanForm.duration), monthlyPayment: Number(loanForm.monthlyPayment) });
      setLoans([data, ...loans]); setLoanForm({ amount: '', interestRate: '', duration: '', monthlyPayment: '' });
      addToast('success', t('toast.loanAdded'), `Loan of ${loanForm.amount} TND`);
    } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); }
  };

  const addAsset = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/assets', { name: assetForm.name, value: Number(assetForm.value), depreciationRate: Number(assetForm.depreciationRate) });
      setAssets([data, ...assets]); setAssetForm({ name: '', value: '', depreciationRate: '' });
      addToast('success', t('toast.assetAdded'), `"${assetForm.name}" added`);
    } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); }
  };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('financeD.title')}</h2></section><SkeletonKPIGrid count={4} /><SkeletonChart /></div>);

  const totalDebt = loans.reduce((s, l) => s + l.amount, 0);
  const monthlyPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const ratio = totalAssets > 0 ? (totalDebt / totalAssets).toFixed(2) : 'N/A';

  const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
  const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('financeD.title')}</h2>
        <p className="text-on-surface-variant mt-2">{t('financeD.subtitle')}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard label={t('financeD.totalDebt')} value={totalDebt} suffix=" TND" icon="credit_score" iconColor="red" />
        <KPICard label={t('financeD.monthlyPayments')} value={monthlyPayments} suffix=" TND" icon="payments" iconColor="yellow" />
        <KPICard label={t('financeD.totalAssets')} value={totalAssets} suffix=" TND" icon="inventory_2" iconColor="green" />
        <KPICard label={t('financeD.debtToAsset')} value={ratio} icon="analytics" iconColor="blue" progress={Math.min(parseFloat(ratio) * 50, 100) || 0} />
      </div>

      {assets.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 mb-10">
          <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100 mb-6">{t('financeD.assetValuation')}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assets.map((a) => ({ name: a.name, value: a.value }))} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#42474f' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#727780' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} formatter={(v) => `${v.toLocaleString()} TND`} />
                <Bar dataKey="value" fill="#0f4c81" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('financeD.addLoan')}</h3>
          <form onSubmit={addLoan} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>{t('common.amount')}</label><input type="number" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
              <div><label className={labelCls}>{t('financeD.interestRate')}</label><input type="number" step="0.01" value={loanForm.interestRate} onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })} className={inputCls} placeholder="5.5" required min="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>{t('financeD.duration')}</label><input type="number" value={loanForm.duration} onChange={(e) => setLoanForm({ ...loanForm, duration: e.target.value })} className={inputCls} placeholder="24" required min="1" /></div>
              <div><label className={labelCls}>{t('financeD.monthlyPayment')}</label><input type="number" value={loanForm.monthlyPayment} onChange={(e) => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
            </div>
            <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('financeD.addLoan')}</button>
          </form>
        </div>
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('financeD.addAsset')}</h3>
          <form onSubmit={addAsset} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>{t('common.name')}</label><ComboInput value={assetForm.name} onChange={(val) => setAssetForm({ ...assetForm, name: val })} options={[...new Set(assets.map((a) => a.name).filter(Boolean))]} placeholder={t('financeD.selectAsset')} label="asset" required /></div>
              <div><label className={labelCls}>{t('financeD.value')}</label><input type="number" value={assetForm.value} onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
            </div>
            <div><label className={labelCls}>{t('financeD.depreciationRate')}</label><input type="number" step="0.1" value={assetForm.depreciationRate} onChange={(e) => setAssetForm({ ...assetForm, depreciationRate: e.target.value })} className={inputCls} placeholder="15" required min="0" max="100" /></div>
            <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('financeD.addAsset')}</button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('financeD.loans')}</h3>
          {loans.length === 0 ? <EmptyState icon="account_balance" title={t('financeD.noLoans')} message={t('financeD.noLoansMsg')} /> : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.amount')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.interestRate')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.duration')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.monthlyPayment')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
              {loans.map((l) => (<tr key={l._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{l.amount.toLocaleString()} TND</td><td className="py-3 text-sm text-on-surface-variant">{l.interestRate}%</td><td className="py-3 text-sm text-on-surface-variant">{l.duration}mo</td><td className="py-3 text-sm font-bold text-on-surface dark:text-slate-200">{l.monthlyPayment.toLocaleString()} TND</td></tr>))}
            </tbody></table></div>
          )}
        </div>
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('financeD.assets')}</h3>
          {assets.length === 0 ? <EmptyState icon="inventory_2" title={t('financeD.noAssets')} message={t('financeD.noAssetsMsg')} /> : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.name')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.value')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.depreciationRate')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
              {assets.map((a) => (<tr key={a._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{a.name}</td><td className="py-3 text-sm text-on-surface dark:text-slate-300">{a.value.toLocaleString()} TND</td><td className="py-3 text-sm text-on-surface-variant">{a.depreciationRate}%/yr</td></tr>))}
            </tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
