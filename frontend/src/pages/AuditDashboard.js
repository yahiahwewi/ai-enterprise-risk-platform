import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import KPICard from '../components/KPICard';
import { SkeletonKPIGrid } from '../components/Skeleton';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

export default function AuditDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/audit/summary');
      setSummary(data);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, lang]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <div>
      <ReadOnlyBanner />
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">
        {lang === 'fr' ? 'Tableau de bord audit' : 'Audit dashboard'}
      </h2></section>
      <SkeletonKPIGrid count={4} />
    </div>
  );

  const inv = summary?.invoices?.summary || {};
  const rep = summary?.reports?.summary || {};

  const reportChip = (r) => {
    if (r.verified)                   return { label: lang === 'fr' ? 'Authentique' : 'Authentic', cls: 'bg-green-100 text-green-700' };
    if (r.reason === 'no_signature')  return { label: lang === 'fr' ? 'Non signé' : 'Unsigned',    cls: 'bg-slate-200 text-slate-600' };
    if (r.reason === 'hash_mismatch') return { label: lang === 'fr' ? 'Modifié' : 'Edited',        cls: 'bg-orange-100 text-orange-700' };
    if (r.reason === 'file_missing')  return { label: lang === 'fr' ? 'Fichier manquant' : 'Missing file', cls: 'bg-red-100 text-red-700' };
    return { label: lang === 'fr' ? 'Échec' : 'Failed', cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div>
      <ReadOnlyBanner />

      <section className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
            {lang === 'fr' ? 'Tableau de bord audit' : 'Audit dashboard'}
          </h2>
          <p className="text-on-surface-variant mt-2">
            {lang === 'fr'
              ? 'Vérification de l\'intégrité des factures, de la certification des rapports et de l\'activité récente.'
              : 'Invoice integrity, report certification and recent activity overview.'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="executive-gradient text-white text-sm font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
            {refreshing ? 'progress_activity' : 'refresh'}
          </span>
          {lang === 'fr' ? 'Relancer l\'audit global' : 'Re-run audit'}
        </button>
      </section>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label={lang === 'fr' ? 'Factures originales' : 'Original invoices'}
          value={`${inv.original || 0}/${inv.total || 0}`}
          icon="verified_user"
          iconColor="green"
        />
        <KPICard
          label={lang === 'fr' ? 'Factures modifiées' : 'Modified invoices'}
          value={inv.modified || 0}
          icon="security"
          iconColor={inv.modified > 0 ? 'orange' : 'green'}
        />
        <KPICard
          label={lang === 'fr' ? 'Rapports authentiques' : 'Authentic reports'}
          value={`${rep.verified || 0}/${rep.total || 0}`}
          icon="verified"
          iconColor="blue"
        />
        <KPICard
          label={lang === 'fr' ? 'Rapports altérés' : 'Altered reports'}
          value={(rep.altered || 0) + (rep.missing || 0)}
          icon="gpp_bad"
          iconColor={(rep.altered + rep.missing) > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Reports list */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100">
            {lang === 'fr' ? 'Rapports certifiés' : 'Certified reports'} ({rep.total || 0})
          </h3>
          <Link to="/reports" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            {lang === 'fr' ? 'Voir la liste complète' : 'See full list'}
          </Link>
        </div>
        {(summary?.reports?.items || []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {lang === 'fr' ? 'Aucun rapport disponible.' : 'No reports available.'}
          </p>
        ) : (
          <div className="space-y-2">
            {summary.reports.items.slice(0, 10).map((r) => {
              const chip = reportChip(r);
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low dark:bg-slate-700/50">
                  <span className={`material-symbols-outlined text-[22px] ${r.verified ? 'text-green-600' : 'text-orange-500'}`}>
                    {r.verified ? 'verified' : r.reason === 'hash_mismatch' ? 'edit_note' : 'gpp_bad'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{r.title}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      v{r.version} · {r.type} · {r.period}
                      {r.generatedByName && <> · <span className="font-semibold">{r.generatedByName}</span></>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modified invoices */}
      {inv.modified > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 mb-8">
          <h3 className="text-base font-bold font-headline text-orange-700 dark:text-orange-300 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            {lang === 'fr' ? 'Factures modifiées à auditer' : 'Invoices flagged for audit'}
          </h3>
          <div className="space-y-2">
            {summary.invoices.items.filter((i) => i.intact === false).slice(0, 10).map((i) => (
              <div key={i.invoiceId} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{i.clientName}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    INV-{String(i.invoiceId).slice(-6).toUpperCase()} · {i.amount?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND
                  </p>
                </div>
                {i.changedFields?.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                    {i.changedFields.map((f) => (
                      <span key={f} className="text-[9px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link to="/invoices" className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 dark:text-orange-300 hover:underline mt-3">
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            {lang === 'fr' ? 'Ouvrir le module Factures' : 'Open Invoices module'}
          </Link>
        </div>
      )}

      {/* Recent activity */}
      {summary?.activity?.recent?.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100">
              {lang === 'fr' ? 'Activité récente (30 jours)' : 'Recent activity (30 days)'}
            </h3>
            <Link to="/activity" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              {lang === 'fr' ? 'Journal complet' : 'Full log'}
            </Link>
          </div>
          <ul className="divide-y divide-surface-container-high dark:divide-slate-700">
            {summary.activity.recent.slice(0, 8).map((a, i) => (
              <li key={i} className="py-2.5 flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-slate-400">history</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface dark:text-slate-200">
                    <span className="font-bold">{a.userId?.name || 'Système'}</span>
                    {' · '}
                    <span className="text-on-surface-variant">{a.action} {a.entity}</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {new Date(a.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
