import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { t } = useLang();

  const fetchLogs = useCallback((offset = 0) => {
    api.get(`/activity?limit=20&offset=${offset}`)
      .then((r) => { if (offset === 0) setLogs(r.data.logs); else setLogs((p) => [...p, ...r.data.logs]); setTotal(r.data.total); setHasMore(r.data.hasMore); })
      .catch(() => addToast('error', t('toast.error'), 'Failed'))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('activity.title')}</h2></section><SkeletonTable rows={8} cols={3} /></div>);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('activity.title')}</h2>
        <p className="text-on-surface-variant mt-2">{total} {t('activity.recorded')}</p>
      </section>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        {logs.length === 0 ? (
          <EmptyState icon="history" title={t('activity.noData')} message={t('activity.noDataMsg')} />
        ) : (
          <div className="space-y-0 divide-y divide-surface-container-high dark:divide-slate-700">
            {logs.map((log) => (
              <div key={log._id} className="flex gap-3 py-4 hover:bg-surface-container-low dark:hover:bg-slate-700/30 -mx-2 px-2 rounded-lg transition-colors">
                <div className="w-9 h-9 rounded-full executive-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {log.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-on-surface dark:text-slate-300">
                    <strong className="text-on-surface dark:text-slate-100">{log.userId?.name || 'Unknown'}</strong>{' '}
                    <span className="text-on-surface-variant">{log.details || `${log.action} a ${log.entityType}`}</span>
                  </p>
                  <span className="text-[11px] text-on-surface-variant">{timeAgo(log.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="text-center mt-6">
            <button onClick={() => fetchLogs(logs.length)} className="bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 text-xs font-bold px-6 py-2 rounded-lg hover:bg-surface-container-highest dark:hover:bg-slate-600 transition-colors">
              {t('common.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
