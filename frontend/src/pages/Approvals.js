import { useState, useEffect } from 'react';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const statusBadge = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { lang } = useLang();

  const l = lang === 'fr' ? {
    title: 'Approbations', subtitle: 'Éléments en attente de validation',
    approve: 'Approuver', reject: 'Rejeter', noData: 'Aucune approbation en attente',
    noDataMsg: 'Toutes les demandes ont été traitées.', rule: 'Règle', amount: 'Montant',
    type: 'Type', requestedBy: 'Demandé par', date: 'Date',
  } : {
    title: 'Approvals', subtitle: 'Items pending validation',
    approve: 'Approve', reject: 'Reject', noData: 'No pending approvals',
    noDataMsg: 'All requests have been processed.', rule: 'Rule', amount: 'Amount',
    type: 'Type', requestedBy: 'Requested by', date: 'Date',
  };

  useEffect(() => { api.get('/approvals/pending').then(r => setApprovals(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/approvals/${id}/approve`);
      setApprovals(approvals.filter(a => a._id !== id));
      addToast('success', l.approve, '');
    } catch { addToast('error', 'Error', 'Failed'); }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/approvals/${id}/reject`, { reason: 'Rejected by user' });
      setApprovals(approvals.filter(a => a._id !== id));
      addToast('info', l.reject, '');
    } catch { addToast('error', 'Error', 'Failed'); }
  };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{l.title}</h2></section><SkeletonTable /></div>);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{l.title}</h2>
        <p className="text-on-surface-variant mt-2">{l.subtitle}</p>
      </section>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        {approvals.length === 0 ? (
          <EmptyState icon="task_alt" title={l.noData} message={l.noDataMsg} />
        ) : (
          <div className="space-y-3">
            {approvals.map((a) => (
              <div key={a._id} className="p-4 bg-surface-container-low dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface dark:text-slate-200 capitalize">{a.entityType}</p>
                      <p className="text-xs text-on-surface-variant">{l.rule}: {a.triggeredRule} · {l.requestedBy}: {a.requestedBy?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleApprove(a._id)} className="executive-gradient text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span>{l.approve}
                    </button>
                    <button onClick={() => handleReject(a._id)} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">close</span>{l.reject}
                    </button>
                  </div>
                </div>
                {a.entity && (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-on-surface-variant">{l.amount}:</span> <strong>{a.entity.amount?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</strong></div>
                    {a.entity.category && <div><span className="text-on-surface-variant">{lang === 'fr' ? 'Catégorie' : 'Category'}:</span> <strong>{a.entity.category}</strong></div>}
                    {a.entity.clientName && <div><span className="text-on-surface-variant">Client:</span> <strong>{a.entity.clientName}</strong></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
