import { useState, useEffect } from 'react';
import api from '../../services/api';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import { SkeletonKPIGrid, SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';

const statusBadge = {
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t, lang } = useLang();

  const labels = {
    fr: {
      title: 'Administration', subtitle: 'Gestion des utilisateurs et demandes d\'accès',
      pendingRequests: 'Demandes d\'accès en attente', noPending: 'Aucune demande en attente',
      noPendingMsg: 'Toutes les demandes ont été traitées.',
      approve: 'Approuver', reject: 'Refuser', approved: 'Approuvé',
      pendingLabel: 'En attente', rejected: 'Refusé', requestedRole: 'Rôle demandé',
      allUsers: 'Tous les utilisateurs',
    },
    en: {
      title: 'Administration', subtitle: 'User management and access requests',
      pendingRequests: 'Pending Access Requests', noPending: 'No pending requests',
      noPendingMsg: 'All requests have been processed.',
      approve: 'Approve', reject: 'Reject', approved: 'Approved',
      pendingLabel: 'Pending', rejected: 'Rejected', requestedRole: 'Requested Role',
      allUsers: 'All Users',
    },
  };
  const l = labels[lang] || labels.fr;

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/users/pending')])
      .then(([u, p]) => { setUsers(u.data); setPendingUsers(p.data); })
      .catch(() => addToast('error', t('toast.error'), t('toast.failed')))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/users/${id}/approve`);
      setPendingUsers(pendingUsers.filter(u => u._id !== id));
      setUsers(users.map(u => u._id === id ? { ...u, status: 'approved' } : u));
      addToast('success', l.approved, lang === 'fr' ? 'Utilisateur activé' : 'User activated');
    } catch { addToast('error', t('toast.error'), t('toast.failed')); }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/users/${id}/reject`);
      setPendingUsers(pendingUsers.filter(u => u._id !== id));
      setUsers(users.map(u => u._id === id ? { ...u, status: 'rejected' } : u));
      addToast('info', l.rejected, lang === 'fr' ? 'Demande refusée' : 'Request denied');
    } catch { addToast('error', t('toast.error'), t('toast.failed')); }
  };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{l.title}</h2></section><SkeletonKPIGrid count={4} /><SkeletonTable /></div>);

  const rc = (role) => users.filter((u) => u.role === role).length;
  const approvedUsers = users.filter(u => u.status === 'approved');

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{l.title}</h2>
        <p className="text-on-surface-variant mt-2">{l.subtitle}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard label={t('admin.totalUsers')} value={approvedUsers.length} icon="group" iconColor="blue" />
        <KPICard label={l.pendingLabel} value={pendingUsers.length} icon="hourglass_top" iconColor="yellow" />
        <KPICard label={t('admin.accountants')} value={rc('accountant')} icon="calculate" iconColor="green" />
        <KPICard label={t('admin.financeManagers')} value={rc('finance')} icon="account_balance" iconColor="blue" />
      </div>

      {/* Pending Approval Section */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-amber-600">pending_actions</span>
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100">{l.pendingRequests}</h3>
          {pendingUsers.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingUsers.length}</span>
          )}
        </div>
        {pendingUsers.length === 0 ? (
          <EmptyState icon="check_circle" title={l.noPending} message={l.noPendingMsg} />
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full executive-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {u.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface dark:text-slate-200">{u.name}</p>
                    <p className="text-xs text-on-surface-variant">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{u.role}</span>
                  <span className="text-xs text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => handleApprove(u._id)} className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    {l.approve}
                  </button>
                  <button onClick={() => handleReject(u._id)} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    {l.reject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Users */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{l.allUsers}</h3>
        {users.length === 0 ? <EmptyState icon="person_off" title={t('admin.noUsers')} message={t('admin.noUsersMsg')} /> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left">
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.name')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.email')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.role')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.status')}</th>
            <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.joined')}</th>
          </tr></thead><tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors">
                <td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">{u.name}</td>
                <td className="py-3 text-sm text-on-surface-variant">{u.email}</td>
                <td className="py-3"><span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{u.role}</span></td>
                <td className="py-3"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusBadge[u.status] || statusBadge.pending}`}>{u.status}</span></td>
                <td className="py-3 text-sm text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>

      {/* Dev: Reset Data */}
      <ResetDataSection lang={lang} addToast={addToast} />
    </div>
  );
}

function ResetDataSection({ lang, addToast }) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState(null);

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data } = await api.post('/users/reset-data');
      setResult(data.deleted);
      setConfirming(false);
      addToast('success', lang === 'fr' ? 'Données supprimées' : 'Data deleted', '');
    } catch (err) {
      addToast('error', 'Error', err.response?.data?.message || 'Failed');
    }
    setResetting(false);
  };

  return (
    <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mt-10 border border-red-200 dark:border-red-900/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-red-600 text-[20px]">warning</span>
        <h3 className="text-base font-bold font-headline text-red-700 dark:text-red-400">
          {lang === 'fr' ? 'Zone de réinitialisation (Dev)' : 'Reset Zone (Dev)'}
        </h3>
      </div>
      <p className="text-xs text-on-surface-variant mb-4">
        {lang === 'fr'
          ? 'Supprime toutes les transactions, factures, prêts, actifs, notifications, logs, rapports et approbations. Les utilisateurs, présets et règles sont conservés.'
          : 'Deletes all transactions, invoices, loans, assets, notifications, logs, reports and approvals. Users, presets and rules are kept.'}
      </p>

      {result && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 mb-4 text-xs text-red-700 dark:text-red-400">
          {lang === 'fr' ? 'Supprimé' : 'Deleted'}: {Object.entries(result).map(([k, v]) => `${v} ${k}`).join(', ')}
        </div>
      )}

      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-red-600">{lang === 'fr' ? 'Confirmer la suppression ?' : 'Confirm deletion?'}</span>
          <button onClick={handleReset} disabled={resetting} className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">{resetting ? 'hourglass_top' : 'delete_forever'}</span>
            {resetting ? '...' : (lang === 'fr' ? 'Oui, tout supprimer' : 'Yes, delete all')}
          </button>
          <button onClick={() => setConfirming(false)} className="text-xs font-bold text-on-surface-variant px-3 py-2">{lang === 'fr' ? 'Annuler' : 'Cancel'}</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
          {lang === 'fr' ? 'Réinitialiser les données financières' : 'Reset financial data'}
        </button>
      )}
    </div>
  );
}
