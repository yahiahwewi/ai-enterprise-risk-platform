import { useState, useEffect } from 'react';
import api from '../../services/api';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import { SkeletonKPIGrid, SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t } = useLang();

  useEffect(() => { api.get('/users').then((r) => setUsers(r.data)).catch(() => addToast('error', t('toast.error'), 'Failed')).finally(() => setLoading(false)); }, [addToast, t]);

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('admin.title')}</h2></section><SkeletonKPIGrid count={4} /><SkeletonTable /></div>);

  const rc = (role) => users.filter((u) => u.role === role).length;

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('admin.title')}</h2>
        <p className="text-on-surface-variant mt-2">{t('admin.subtitle')}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard label={t('admin.totalUsers')} value={users.length} icon="group" iconColor="blue" />
        <KPICard label={t('admin.owners')} value={rc('owner')} icon="badge" iconColor="green" />
        <KPICard label={t('admin.accountants')} value={rc('accountant')} icon="calculate" iconColor="yellow" />
        <KPICard label={t('admin.financeManagers')} value={rc('finance')} icon="account_balance" iconColor="blue" />
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('admin.allUsers')}</h3>
        {users.length === 0 ? <EmptyState icon="person_off" title={t('admin.noUsers')} message={t('admin.noUsersMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left">
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.name')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.email')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.role')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.joined')}</th>
          </tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{u.name}</td>
                <td className="py-3 text-sm text-on-surface-variant">{u.email}</td>
                <td className="py-3"><span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{u.role}</span></td>
                <td className="py-3 text-sm text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
