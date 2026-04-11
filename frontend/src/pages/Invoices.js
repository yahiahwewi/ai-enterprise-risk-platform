import { useState, useEffect } from 'react';
import api from '../services/api';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import ComboInput from '../components/ComboInput';
import { SkeletonKPIGrid, SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";
const statusBadge = { paid: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', late: 'bg-red-100 text-red-700' };

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ clientName: '', amount: '', dueDate: '', status: 'pending' });
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/invoices').then((r) => setInvoices(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  const add = async (e) => { e.preventDefault(); try { const { data } = await api.post('/invoices', { ...form, amount: Number(form.amount) }); setInvoices([data, ...invoices]); setForm({ clientName: '', amount: '', dueDate: '', status: 'pending' }); addToast('success', t('toast.invoiceCreated'), `Invoice for ${form.clientName}`); } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); } };

  const updateStatus = async (id, status) => { try { const { data } = await api.patch(`/invoices/${id}`, { status }); setInvoices(invoices.map((inv) => (inv._id === id ? data : inv))); addToast('success', t('toast.updated'), `Marked as ${status}`); } catch { addToast('error', t('toast.error'), 'Failed'); } };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('invoicesPage.title')}</h2></section><SkeletonKPIGrid count={3} /><SkeletonTable /></div>);

  return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('invoicesPage.title')}</h2><p className="text-on-surface-variant mt-2">{t('invoicesPage.subtitle')}</p></section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <KPICard label={t('invoicesPage.paid')} value={invoices.filter((i) => i.status === 'paid').length} icon="check_circle" iconColor="green" />
        <KPICard label={t('invoicesPage.pending')} value={invoices.filter((i) => i.status === 'pending').length} icon="schedule" iconColor="yellow" />
        <KPICard label={t('invoicesPage.late')} value={invoices.filter((i) => i.status === 'late').length} icon="warning" iconColor="red" />
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('invoicesPage.newInvoice')}</h3>
        <form onSubmit={add} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={labelCls}>{t('accountant.client')}</label><ComboInput value={form.clientName} onChange={(val) => setForm({ ...form, clientName: val })} options={[...new Set(invoices.map((i) => i.clientName).filter(Boolean))]} placeholder={t('accountant.selectClient')} label="client" required /></div>
            <div><label className={labelCls}>{t('common.amount')}</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" required min="0" /></div>
            <div><label className={labelCls}>{t('accountant.dueDate')}</label><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} required /></div>
            <div><label className={labelCls}>{t('common.status')}</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option value="pending">Pending</option><option value="paid">Paid</option><option value="late">Late</option></select></div>
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('invoicesPage.createInvoice')}</button>
        </form>
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('invoicesPage.all')}</h3>
        {invoices.length === 0 ? <EmptyState icon="description" title={t('invoicesPage.noData')} message={t('invoicesPage.noDataMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.client')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.amount')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('accountant.dueDate')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.status')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.actions')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {invoices.map((inv) => (<tr key={inv._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{inv.clientName}</td><td className="py-3 text-sm">{inv.amount.toLocaleString()} TND</td><td className="py-3 text-sm text-on-surface-variant">{new Date(inv.dueDate).toLocaleDateString()}</td><td className="py-3"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusBadge[inv.status]}`}>{inv.status}</span></td><td className="py-3 flex gap-2">{inv.status === 'pending' && <><button onClick={() => updateStatus(inv._id, 'paid')} className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">{t('common.markPaid')}</button><button onClick={() => updateStatus(inv._id, 'late')} className="bg-surface-container-high text-on-surface text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container-highest">{t('invoicesPage.markLate')}</button></>}{inv.status === 'late' && <button onClick={() => updateStatus(inv._id, 'paid')} className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">{t('common.markPaid')}</button>}</td></tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
