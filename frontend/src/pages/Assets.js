import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import ComboInput from '../components/ComboInput';
import { SkeletonKPIGrid, SkeletonChart } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', value: '', depreciationRate: '' });
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/assets').then((r) => setAssets(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  const add = async (e) => { e.preventDefault(); try { const { data } = await api.post('/assets', { name: form.name, value: Number(form.value), depreciationRate: Number(form.depreciationRate) }); setAssets([data, ...assets]); setForm({ name: '', value: '', depreciationRate: '' }); addToast('success', t('toast.assetAdded'), `"${form.name}" added`); } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); } };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('assetsPage.title')}</h2></section><SkeletonKPIGrid count={2} /><SkeletonChart /></div>);

  const totalValue = assets.reduce((s, a) => s + a.value, 0);

  return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('assetsPage.title')}</h2><p className="text-on-surface-variant mt-2">{t('assetsPage.subtitle')}</p></section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <KPICard label={t('assetsPage.totalValue')} value={totalValue} prefix="$" icon="inventory_2" iconColor="green" />
        <KPICard label={t('assetsPage.count')} value={assets.length} icon="category" iconColor="blue" />
      </div>

      {assets.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 mb-10">
          <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('assetsPage.valuation')}</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assets.map((a) => ({ name: a.name, value: a.value }))} barSize={36}><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#42474f' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#727780' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e6e8ea' }} formatter={(v) => `$${v.toLocaleString()}`} /><Bar dataKey="value" fill="#0f4c81" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('assetsPage.add')}</h3>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>{t('common.name')}</label><ComboInput value={form.name} onChange={(val) => setForm({ ...form, name: val })} options={[...new Set(assets.map((a) => a.name).filter(Boolean))]} placeholder={t('financeD.selectAsset')} label="asset" required /></div>
            <div><label className={labelCls}>{t('financeD.value')}</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
            <div><label className={labelCls}>{t('financeD.depreciationRate')}</label><input type="number" step="0.1" value={form.depreciationRate} onChange={(e) => setForm({ ...form, depreciationRate: e.target.value })} className={inputCls} placeholder="15" required min="0" max="100" /></div>
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('assetsPage.add')}</button>
        </form>
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('assetsPage.all')}</h3>
        {assets.length === 0 ? <EmptyState icon="inventory_2" title={t('assetsPage.noData')} message={t('assetsPage.noDataMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.name')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.value')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('financeD.depreciationRate')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.date')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {assets.map((a) => (<tr key={a._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{a.name}</td><td className="py-3 text-sm">${a.value.toLocaleString()}</td><td className="py-3 text-sm text-on-surface-variant">{a.depreciationRate}%/yr</td><td className="py-3 text-sm text-on-surface-variant">{new Date(a.createdAt).toLocaleDateString()}</td></tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
