import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLang } from '../context/LanguageContext';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const severityColor = { critical: 'border-error', warning: 'border-orange-400', info: 'border-blue-400' };
const severityText = { critical: 'text-error', warning: 'text-orange-600', info: 'text-blue-600' };
export default function NotificationBell() {
  const { t } = useLang();
  const severityLabel = { critical: t('notif.urgent'), warning: t('notif.warning'), info: t('notif.info') };
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const fetchCount = () => { api.get('/notifications/unread-count').then((r) => setCount(r.data.count)).catch(() => {}); };

  useEffect(() => { fetchCount(); const iv = setInterval(fetchCount, 30000); return () => clearInterval(iv); }, []);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleOpen = () => {
    if (!open) api.get('/notifications').then((r) => setNotifications(r.data)).catch(() => {});
    setOpen(!open);
  };

  const markAsRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(notifications.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read').catch(() => {});
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggleOpen} className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-900 dark:hover:text-blue-100 transition-colors">
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {count > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-slate-100 dark:border-slate-900" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[440px] overflow-y-auto bg-surface-container-lowest dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[1000]">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold font-headline text-on-surface dark:text-slate-200">{t('notif.title')}</span>
            {count > 0 && (
              <button onClick={markAllRead} className="text-primary text-xs font-bold hover:underline">{t('notif.markAllRead')}</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">{t('notif.noNotif')}</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer hover:bg-surface-container-low dark:hover:bg-slate-700 transition-colors ${!n.read ? `border-l-4 ${severityColor[n.severity] || 'border-blue-400'} bg-blue-50/30 dark:bg-blue-900/10` : ''}`}
                onClick={() => !n.read && markAsRead(n._id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${severityText[n.severity] || 'text-blue-600'}`}>
                    {severityLabel[n.severity] || 'Info'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">{timeAgo(n.createdAt)}</span>
                </div>
                <h4 className="text-sm font-bold text-on-surface dark:text-slate-200 mb-0.5">{n.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{n.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
