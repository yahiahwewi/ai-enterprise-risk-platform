import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { SkeletonKPIGrid } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const SECTION_DEF = [
  { key: 'contexte',        fr: 'Contexte',          en: 'Context',          icon: 'flag' },
  { key: 'observations',    fr: 'Observations',      en: 'Observations',     icon: 'search' },
  { key: 'causes',          fr: 'Causes probables',  en: 'Probable causes',  icon: 'psychology' },
  { key: 'recommandations', fr: 'Recommandations',   en: 'Recommendations',  icon: 'lightbulb' },
];

export default function OwnerAlerts() {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ackingId, setAckingId] = useState(null);
  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/risk-memos/pending-alerts');
      setMemos(data || []);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setLoading(false);
    }
  }, [addToast, lang]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = async (id) => {
    setAckingId(id);
    try {
      await api.post(`/risk-memos/${id}/acknowledge`);
      setMemos((prev) => prev.filter((m) => m._id !== id));
      addToast('success',
        lang === 'fr' ? 'Alerte acquittée' : 'Alert acknowledged',
        lang === 'fr' ? 'L\'analyste sera notifié.' : 'The analyst will be notified.');
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setAckingId(null);
    }
  };

  if (loading) return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">
        {lang === 'fr' ? 'Alertes critiques' : 'Critical alerts'}
      </h2></section>
      <SkeletonKPIGrid count={2} />
    </div>
  );

  return (
    <div>
      <section className="mb-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px] text-red-600">crisis_alert</span>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
              {lang === 'fr' ? 'Alertes critiques' : 'Critical alerts'}
            </h2>
            <p className="text-on-surface-variant mt-1">
              {lang === 'fr'
                ? 'Mémos critiques remontés par les analystes. Acquitter signale à l\'analyste que vous avez pris connaissance.'
                : 'Critical memos escalated by analysts. Acknowledging signals that you have reviewed the alert.'}
            </p>
          </div>
        </div>
      </section>

      {memos.length === 0 ? (
        <EmptyState
          icon="verified"
          title={lang === 'fr' ? 'Aucune alerte en attente' : 'No pending alerts'}
          message={lang === 'fr'
            ? 'Toutes les alertes critiques ont été acquittées.'
            : 'All critical alerts have been acknowledged.'}
        />
      ) : (
        <div className="space-y-5">
          {memos.map((m) => (
            <div
              key={m._id}
              className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-start justify-between gap-4" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(153,27,27,0.12))' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-[26px] text-red-600">warning</span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-red-700 dark:text-red-400">
                      {lang === 'fr' ? 'Alerte critique' : 'Critical alert'} · {m.authorName}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {new Date(m.escalatedAt || m.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                      {m.snapshotScore !== undefined && ` · ${lang === 'fr' ? 'Score IA' : 'AI score'} ${m.snapshotScore}/100`}
                      {m.snapshotLevel && ` · ${m.snapshotLevel}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => acknowledge(m._id)}
                  disabled={ackingId === m._id}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-4 py-2 rounded-lg shadow disabled:opacity-60"
                >
                  {ackingId === m._id
                    ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[14px]">check_circle</span>}
                  {lang === 'fr' ? 'Acquitter' : 'Acknowledge'}
                </button>
              </div>

              {/* Memo sections */}
              <div className="px-6 py-5 space-y-4">
                {SECTION_DEF.map((def) => {
                  const val = m.sections?.[def.key];
                  if (!val) return null;
                  return (
                    <div key={def.key}>
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        <span className="material-symbols-outlined text-[14px]">{def.icon}</span>
                        {lang === 'fr' ? def.fr : def.en}
                      </p>
                      <p className="text-sm text-on-surface dark:text-slate-200 whitespace-pre-wrap">{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
