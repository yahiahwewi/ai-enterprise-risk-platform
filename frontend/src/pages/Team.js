import { useState, useEffect } from 'react';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'accountant' });
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/users').then((r) => setMembers(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  const invite = async (e) => { e.preventDefault(); try { const { data } = await api.post('/users/invite', form); setMembers([...members, data]); setForm({ name: '', email: '', password: '', role: 'accountant' }); addToast('success', 'Invited', `${data.name} joined as ${data.role}`); } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || 'Failed'); } };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('teamPage.title')}</h2></section><SkeletonTable /></div>);

  return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('teamPage.title')}</h2><p className="text-on-surface-variant mt-2">{t('teamPage.subtitle')}</p></section>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('teamPage.invite')}</h3>
        <form onSubmit={invite} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={labelCls}>{t('auth.fullName')}</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="John Doe" required /></div>
            <div><label className={labelCls}>{t('common.email')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="email@company.com" required /></div>
            <div><label className={labelCls}>{t('teamPage.tempPassword')}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Min 6 chars" required minLength={6} /></div>
            <div><label className={labelCls}>{t('common.role')}</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}><option value="accountant">{t('teamPage.roleAccountant')}</option><option value="finance">{t('teamPage.roleFinance')}</option></select></div>
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90">{t('teamPage.inviteBtn')}</button>
        </form>
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('teamPage.members')}</h3>
        {members.length === 0 ? <EmptyState icon="group_off" title={t('teamPage.noData')} message={t('teamPage.noDataMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left"><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.name')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.email')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.role')}</th><th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.joined')}</th></tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {members.map((m) => (<tr key={m._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"><td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{m.name}</td><td className="py-3 text-sm text-on-surface-variant">{m.email}</td><td className="py-3"><span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{m.role}</span></td><td className="py-3 text-sm text-on-surface-variant">{new Date(m.createdAt).toLocaleDateString()}</td></tr>))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
