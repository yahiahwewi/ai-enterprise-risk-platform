/**
 * AnalystAlertBanner
 * Floating, pulsing red banner shown on every page for owner/admin when one or
 * more critical analyst memos are pending acknowledgement. Auto-refreshes every
 * 30 seconds so alerts appear in near real-time without reloading.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function AnalystAlertBanner() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState(null);

  const canSee = user && ['owner', 'admin'].includes(user.role);

  const fetchAlerts = useCallback(async () => {
    if (!canSee) return;
    try {
      const { data } = await api.get('/risk-memos/pending-alerts');
      setCount(Array.isArray(data) ? data.length : 0);
      setLatest(Array.isArray(data) && data.length ? data[0] : null);
    } catch {
      // silent — a failed poll shouldn't disturb the user
    }
  }, [canSee]);

  useEffect(() => {
    fetchAlerts();
    if (!canSee) return;
    const id = setInterval(fetchAlerts, 30000); // 30 s polling
    return () => clearInterval(id);
  }, [fetchAlerts, canSee]);

  if (!canSee || count === 0) return null;

  return (
    <div
      className="fixed top-0 left-64 right-0 z-40 border-b border-red-700 shadow-lg"
      style={{ background: 'linear-gradient(90deg,#b91c1c,#991b1b,#7f1d1d)' }}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-6 py-2.5">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-100"></span>
        </span>
        <span className="material-symbols-outlined text-white text-[22px]">crisis_alert</span>
        <div className="flex-1 min-w-0 text-white">
          <p className="text-sm font-extrabold leading-tight">
            {count === 1
              ? (lang === 'fr' ? 'Alerte critique d\'un analyste' : 'Critical analyst alert')
              : (lang === 'fr' ? `${count} alertes critiques en attente` : `${count} critical alerts pending`)}
          </p>
          {latest && (
            <p className="text-[11px] text-red-100 truncate">
              {latest.authorName} · {new Date(latest.escalatedAt || latest.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
              {latest.snapshotScore !== undefined && ` · ${lang === 'fr' ? 'Score' : 'Score'} ${latest.snapshotScore}/100`}
            </p>
          )}
        </div>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-1.5 bg-white text-red-700 text-xs font-extrabold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors shadow"
        >
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          {lang === 'fr' ? 'Consulter' : 'Review'}
        </Link>
      </div>
    </div>
  );
}
