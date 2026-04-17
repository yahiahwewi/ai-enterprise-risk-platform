import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLang } from '../context/LanguageContext';

function timeAgo(date, lang) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (lang === 'fr') {
    if (s < 60)    return "à l'instant";
    if (s < 3600)  return `il y a ${Math.floor(s / 60)}min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
    return `il y a ${Math.floor(s / 86400)}j`;
  }
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TYPE_ICON = {
  risk_alert:          { icon: 'warning',           cls: 'text-red-500    bg-red-50    dark:bg-red-900/30'    },
  invoice_overdue:     { icon: 'receipt_long',       cls: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30' },
  cash_flow_negative:  { icon: 'trending_down',      cls: 'text-red-500    bg-red-50    dark:bg-red-900/30'    },
  anomaly_detected:    { icon: 'bar_chart',          cls: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  approval_needed:     { icon: 'pending_actions',    cls: 'text-blue-500   bg-blue-50   dark:bg-blue-900/30'   },
  rule_triggered:      { icon: 'gavel',              cls: 'text-amber-500  bg-amber-50  dark:bg-amber-900/30'  },
  daily_summary:       { icon: 'today',              cls: 'text-teal-500   bg-teal-50   dark:bg-teal-900/30'   },
  weekly_report:       { icon: 'calendar_view_week', cls: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
  system:              { icon: 'info',               cls: 'text-slate-500  bg-slate-100 dark:bg-slate-700'     },
};

const SEVERITY_BAR = {
  critical: 'bg-red-500',
  warning:  'bg-orange-400',
  info:     'bg-blue-400',
};

export default function NotificationBell() {
  const { t, lang } = useLang();
  const [count, setCount]             = useState(0);
  const [notifications, setNotifs]    = useState([]);
  const [open, setOpen]               = useState(false);
  const bellRef                       = useRef();

  /* ── fetch unread count every 30s ── */
  const fetchCount = () =>
    api.get('/notifications/unread-count').then((r) => setCount(r.data.count)).catch(() => {});

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  /* ── close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = () => {
    if (!open) api.get('/notifications').then((r) => setNotifs(r.data)).catch(() => {});
    setOpen((v) => !v);
  };

  const markAsRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read').catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    /* wrapper ref — captures outside-click target */
    <div ref={bellRef} className="relative">

      {/* ── Bell button ── */}
      <button
        onClick={toggleOpen}
        className={`relative p-2 rounded-lg transition-colors ${
          open
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-900 dark:hover:text-blue-100'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {count > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-900 leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* ── Dropdown panel — fixed so it escapes sidebar clipping ── */}
      {open && (
        <div
          className="fixed w-[420px] bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
          style={{
            zIndex: 9999,
            left: '272px',          /* sidebar width (256px) + 16px gap */
            bottom: '72px',         /* above the bottom user-card strip  */
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">notifications</span>
              <span className="text-sm font-extrabold font-headline text-on-surface dark:text-slate-100">
                {lang === 'fr' ? 'Notifications' : 'Notifications'}
              </span>
              {unread > 0 && (
                <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-primary dark:text-blue-400 hover:underline"
              >
                {lang === 'fr' ? 'Tout lire' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification list — scrollable */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
                <span className="material-symbols-outlined text-[40px] opacity-40">notifications_off</span>
                <p className="text-sm">{lang === 'fr' ? 'Aucune notification' : 'No notifications'}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_ICON[n.type] || TYPE_ICON.system;
                return (
                  <div
                    key={n._id}
                    onClick={() => !n.read && markAsRead(n._id)}
                    className={`flex gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-700/50 transition-colors cursor-pointer ${
                      !n.read
                        ? 'bg-blue-50/60 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        : 'hover:bg-surface-container-low dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {/* Severity bar */}
                    <div className={`w-0.5 shrink-0 rounded-full self-stretch ${SEVERITY_BAR[n.severity] || 'bg-blue-400'}`} />

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.cls}`}>
                      <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm font-bold leading-snug ${!n.read ? 'text-on-surface dark:text-slate-100' : 'text-on-surface dark:text-slate-200'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-on-surface-variant whitespace-nowrap shrink-0 mt-0.5">
                          {timeAgo(n.createdAt, lang)}
                        </span>
                      </div>

                      {/* Full message — no truncation */}
                      <p className="text-xs text-on-surface-variant leading-relaxed break-words">
                        {n.message}
                      </p>

                      {/* Type chip */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${meta.cls}`}>
                          {n.type?.replace(/_/g, ' ')}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <p className="text-[10px] text-center text-on-surface-variant">
                {notifications.length} {lang === 'fr' ? 'notification(s) au total' : 'notification(s) total'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
