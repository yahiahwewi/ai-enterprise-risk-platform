import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { key: 'owner', fr: 'Owner', en: 'Owner', color: '#002b4c' },
  { key: 'admin', fr: 'Admin', en: 'Admin', color: '#1f2937' },
  { key: 'finance', fr: 'Finance', en: 'Finance', color: '#0d7a4a' },
  { key: 'accountant', fr: 'Comptable', en: 'Accountant', color: '#b8860b' },
  { key: 'analyst', fr: 'Analyste', en: 'Analyst', color: '#7c3aed' },
  { key: 'auditor', fr: 'Auditeur', en: 'Auditor', color: '#c8102e' },
];

const CATEGORY_META = {
  auth: { fr: 'Authentification & Compte', en: 'Authentication & Account', icon: 'lock' },
  finance: { fr: 'Finance & Workflow', en: 'Finance & Workflow', icon: 'receipt_long' },
  risk: { fr: 'Risque & IA', en: 'Risk & AI', icon: 'analytics' },
  compliance: { fr: 'Conformité fiscale', en: 'Tax compliance', icon: 'gavel' },
  admin: { fr: 'Administration', en: 'Administration', icon: 'admin_panel_settings' },
};

const PRIORITY_CLR = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    fg: 'text-red-700 dark:text-red-300',
    fr: 'Critique',
    en: 'Critical',
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    fg: 'text-orange-700 dark:text-orange-300',
    fr: 'Haute',
    en: 'High',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    fg: 'text-amber-700 dark:text-amber-300',
    fr: 'Moyenne',
    en: 'Medium',
  },
  low: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    fg: 'text-slate-600 dark:text-slate-300',
    fr: 'Basse',
    en: 'Low',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    fg: 'text-blue-700 dark:text-blue-300',
    fr: 'Info',
    en: 'Info',
  },
};

export default function EmailConfig() {
  const { lang } = useLang();
  const isFr = lang === 'fr';
  const { addToast } = useToast();
  const { user } = useAuth();
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null); // event being edited in modal
  const [testingFor, setTestingFor] = useState(null); // event currently in the "send test" prompt
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [masterLoading, setMasterLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evts, settings] = await Promise.all([
        api.get('/email-events'),
        api.get('/email-events/settings').catch(() => ({ data: { enabled: true } })),
      ]);
      setGrouped(evts.data.grouped || {});
      setMasterEnabled(!!settings.data.enabled);
    } catch (e) {
      addToast(
        'error',
        isFr ? 'Erreur' : 'Error',
        e.response?.data?.message || (isFr ? 'Chargement impossible' : 'Load failed')
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  const toggleMaster = async () => {
    setMasterLoading(true);
    try {
      const { data } = await api.patch('/email-events/settings', { enabled: !masterEnabled });
      setMasterEnabled(!!data.enabled);
      addToast(
        'success',
        data.enabled
          ? isFr
            ? 'Notifications activées'
            : 'Notifications enabled'
          : isFr
            ? 'Notifications mises en pause'
            : 'Notifications paused',
        ''
      );
    } catch (e) {
      addToast('error', isFr ? 'Erreur' : 'Error', e.response?.data?.message);
    } finally {
      setMasterLoading(false);
    }
  };

  const toggleRole = async (evt, role) => {
    setSaving(evt.key);
    const next = evt.defaultRoles.includes(role)
      ? evt.defaultRoles.filter((r) => r !== role)
      : [...evt.defaultRoles, role];
    try {
      const { data } = await api.patch(`/email-events/${encodeURIComponent(evt.key)}`, {
        defaultRoles: next,
      });
      setGrouped((g) => updateInGroups(g, data));
    } catch (e) {
      addToast('error', isFr ? 'Erreur' : 'Error', e.response?.data?.message);
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (evt) => {
    setSaving(evt.key);
    try {
      const { data } = await api.patch(`/email-events/${encodeURIComponent(evt.key)}`, {
        active: !evt.active,
      });
      setGrouped((g) => updateInGroups(g, data));
    } catch (e) {
      addToast('error', isFr ? 'Erreur' : 'Error', e.response?.data?.message);
    } finally {
      setSaving(null);
    }
  };

  const sendTestTo = async (evt, recipientEmail, recipientName) => {
    setSaving(evt.key);
    try {
      const { data } = await api.post(`/email-events/${encodeURIComponent(evt.key)}/test`, {
        lang,
        recipientEmail,
        recipientName,
      });
      addToast('success', isFr ? 'Test envoyé' : 'Test sent', data.message);
      setTestingFor(null);
    } catch (e) {
      addToast('error', isFr ? 'Erreur' : 'Error', e.response?.data?.message);
    } finally {
      setSaving(null);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        isFr
          ? 'Réinsérer les événements manquants depuis le catalogue par défaut ?'
          : 'Re-seed missing events from the default catalogue?'
      )
    )
      return;
    try {
      const { data } = await api.post('/email-events/reset');
      addToast('success', isFr ? 'Réinitialisé' : 'Reset', data.message);
      fetchAll();
    } catch (e) {
      addToast('error', isFr ? 'Erreur' : 'Error', e.response?.data?.message);
    }
  };

  const filtered = useMemo(() => {
    if (!filter.trim()) return grouped;
    const q = filter.toLowerCase();
    const out = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const f = items.filter(
        (e) =>
          e.key.toLowerCase().includes(q) ||
          (isFr ? e.titleFr : e.titleEn).toLowerCase().includes(q) ||
          (isFr ? e.descFr : e.descEn).toLowerCase().includes(q)
      );
      if (f.length) out[cat] = f;
    }
    return out;
  }, [filter, grouped, isFr]);

  const totalEvents = Object.values(grouped).flat().length;
  const activeEvents = Object.values(grouped)
    .flat()
    .filter((e) => e.active).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <section className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[24px]">
              forward_to_inbox
            </span>
            <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
              {isFr ? 'Notifications email' : 'Email notifications'}
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant dark:text-slate-400 mt-1 max-w-2xl">
            {isFr
              ? `Configurez quels rôles reçoivent quel email pour chaque événement métier. ${activeEvents}/${totalEvents} événements actifs.`
              : `Pick which role receives which email for every business event. ${activeEvents}/${totalEvents} events active.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="editorial-btn-ghost text-xs">
            <span className="material-symbols-outlined text-[15px] mr-1">restart_alt</span>
            {isFr ? 'Réinitialiser' : 'Reset'}
          </button>
        </div>
      </section>

      {/* Master ON/OFF banner */}
      <div
        className={`rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap transition-colors ${
          masterEnabled
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              masterEnabled ? 'bg-emerald-500' : 'bg-orange-500'
            }`}
          >
            <span className="material-symbols-outlined text-white text-[22px]">
              {masterEnabled ? 'mark_email_read' : 'pause'}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold font-headline text-on-surface dark:text-slate-100 flex items-center gap-2">
              {isFr ? 'Système de notifications email' : 'Email notification system'}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                  masterEnabled ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                }`}
              >
                {masterEnabled ? (isFr ? 'Actif' : 'On') : isFr ? 'Pause' : 'Off'}
              </span>
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
              {masterEnabled
                ? isFr
                  ? 'Tous les événements actifs ci-dessous déclencheront un email selon leurs règles.'
                  : 'Every active event below will trigger an email per its rules.'
                : isFr
                  ? 'Toutes les notifications email sont suspendues. Les tests manuels restent possibles.'
                  : 'All email notifications are paused. Manual tests still go through.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleMaster}
          disabled={masterLoading}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${
            masterEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
          aria-label="toggle global mailer"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              masterEnabled ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Filter */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
          search
        </span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={
            isFr ? 'Filtrer par clé, titre, description…' : 'Filter by key, title, description…'
          }
          className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/30 rounded-lg py-2.5 pl-10 pr-3 text-sm text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">
          {isFr ? 'Chargement…' : 'Loading…'}
        </div>
      ) : (
        Object.entries(filtered).map(([cat, items]) => {
          const meta = CATEGORY_META[cat] || { fr: cat, en: cat, icon: 'mail' };
          return (
            <div
              key={cat}
              className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl border border-outline-variant/20 dark:border-slate-700 overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-outline-variant/20 dark:border-slate-700 bg-surface-container-low/50 dark:bg-slate-700/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  {meta.icon}
                </span>
                <h3 className="font-bold font-headline text-on-surface dark:text-slate-100">
                  {isFr ? meta.fr : meta.en}
                </h3>
                <span className="text-[11px] text-on-surface-variant ml-auto">{items.length}</span>
              </div>
              <div className="divide-y divide-outline-variant/15 dark:divide-slate-700">
                {items.map((evt) => {
                  const pclr = PRIORITY_CLR[evt.priority] || PRIORITY_CLR.medium;
                  return (
                    <div key={evt.key} className={`px-5 py-4 ${!evt.active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${pclr.bg} ${pclr.fg}`}
                            >
                              {isFr ? pclr.fr : pclr.en}
                            </span>
                            <code className="text-[10px] font-mono text-on-surface-variant">
                              {evt.key}
                            </code>
                          </div>
                          <h4 className="text-sm font-bold text-on-surface dark:text-slate-100 mt-1">
                            {isFr ? evt.titleFr : evt.titleEn}
                          </h4>
                          {(isFr ? evt.descFr : evt.descEn) && (
                            <p className="text-[12px] text-on-surface-variant dark:text-slate-400 mt-0.5 italic">
                              {isFr ? evt.descFr : evt.descEn}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Active toggle */}
                          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={evt.active}
                              onChange={() => toggleActive(evt)}
                              disabled={saving === evt.key}
                            />
                            <span className="font-bold text-on-surface dark:text-slate-200">
                              {isFr ? 'Actif' : 'Active'}
                            </span>
                          </label>
                          <button
                            onClick={() => setTestingFor(evt)}
                            disabled={saving === evt.key}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px] align-middle mr-0.5">
                              send
                            </span>
                            {isFr ? 'Tester' : 'Test'}
                          </button>
                          <button
                            onClick={() => setEditing(evt)}
                            className="text-[11px] px-2.5 py-1 rounded-md border border-outline-variant/40 text-on-surface dark:text-slate-200 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px] align-middle mr-0.5">
                              edit
                            </span>
                            {isFr ? 'Modèle' : 'Template'}
                          </button>
                        </div>
                      </div>

                      {/* Role chips matrix */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="small-caps text-[10px] text-on-surface-variant tracking-widest mr-1">
                          {isFr ? 'Destinataires' : 'Recipients'}
                        </span>
                        {ROLES.map((r) => {
                          const on = evt.defaultRoles.includes(r.key);
                          return (
                            <button
                              key={r.key}
                              onClick={() => toggleRole(evt, r.key)}
                              disabled={saving === evt.key}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                on
                                  ? 'text-white shadow-sm'
                                  : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-slate-600'
                              }`}
                              style={on ? { backgroundColor: r.color } : {}}
                            >
                              {on && (
                                <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">
                                  check
                                </span>
                              )}
                              {isFr ? r.fr : r.en}
                            </button>
                          );
                        })}
                        {evt.defaultRoles.length === 0 && (
                          <span className="text-[10px] italic text-on-surface-variant">
                            {isFr
                              ? "(seul l'acteur ciblé reçoit l'email)"
                              : '(only target actor receives the email)'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {editing && (
        <TemplateEditor
          event={editing}
          isFr={isFr}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setGrouped((g) => updateInGroups(g, updated));
            setEditing(null);
            addToast('success', isFr ? 'Modèle enregistré' : 'Template saved', '');
          }}
        />
      )}

      {testingFor && (
        <TestSendPrompt
          event={testingFor}
          defaultEmail={user?.email || ''}
          defaultName={user?.name || ''}
          isFr={isFr}
          loading={saving === testingFor.key}
          onCancel={() => setTestingFor(null)}
          onSend={(email, name) => sendTestTo(testingFor, email, name)}
        />
      )}
    </div>
  );
}

// ── Test send prompt ───────────────────────────────────────────────────
function TestSendPrompt({ event, defaultEmail, defaultName, isFr, loading, onCancel, onSend }) {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [hist, setHist] = useState([]);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('mail.test.history') || '[]');
      setHist(Array.isArray(h) ? h.slice(0, 5) : []);
    } catch {
      setHist([]);
    }
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (!email.trim() || !/.+@.+\..+/.test(email)) return;
    // remember for next time
    try {
      const h = JSON.parse(localStorage.getItem('mail.test.history') || '[]');
      const next = [email.trim(), ...h.filter((x) => x !== email.trim())].slice(0, 5);
      localStorage.setItem('mail.test.history', JSON.stringify(next));
    } catch {}
    onSend(email.trim(), name.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-outline-variant/20 dark:border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]">
              forward_to_inbox
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold font-headline text-on-surface dark:text-slate-100">
              {isFr ? 'Envoyer un email de test' : 'Send a test email'}
            </h3>
            <code className="text-[10px] text-on-surface-variant truncate block">{event.key}</code>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-[11px] text-on-surface-variant italic">
            {isFr
              ? "Saisissez l'adresse qui recevra l'aperçu. Aucun autre destinataire ne sera notifié."
              : 'Enter the address that will receive the preview. No other recipient will be notified.'}
          </p>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {isFr ? 'Email destinataire' : 'Recipient email'}
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="w-full bg-surface-container-low dark:bg-slate-700 border border-outline-variant/30 rounded-lg py-2.5 px-3 text-sm text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
              {isFr ? 'Nom (optionnel)' : 'Name (optional)'}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isFr ? 'Jane Doe' : 'Jane Doe'}
              className="w-full bg-surface-container-low dark:bg-slate-700 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          {hist.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">
                {isFr ? 'Récents' : 'Recent'}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {hist.map((h, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setEmail(h)}
                    className="text-[11px] px-2 py-1 rounded-md bg-surface-container dark:bg-slate-700 text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-slate-600 transition-colors"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-outline-variant/20 dark:border-slate-700 flex justify-end gap-2 bg-surface-container-low/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-md text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-slate-700"
          >
            {isFr ? 'Annuler' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="text-sm px-4 py-2 rounded-md bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[15px] align-middle mr-1">send</span>
            {loading ? '…' : isFr ? 'Envoyer le test' : 'Send test'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

// ── Template editor modal ──────────────────────────────────────────────
// Layout: [header · 2 sticky] [FR/EN side-by-side body, scroll inside] [footer · sticky]
// The whole modal fits in 90vh; the footer is always visible without scrolling.
function TemplateEditor({ event, isFr, onClose, onSaved }) {
  const [titleFr, setTitleFr] = useState(event.titleFr);
  const [titleEn, setTitleEn] = useState(event.titleEn);
  const [bodyFr, setBodyFr] = useState(event.bodyFr);
  const [bodyEn, setBodyEn] = useState(event.bodyEn);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('edit'); // edit | preview

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/email-events/${encodeURIComponent(event.key)}`, {
        titleFr,
        titleEn,
        bodyFr,
        bodyEn,
      });
      onSaved(data);
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ height: 'min(86vh, 760px)' }}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-3 border-b border-outline-variant/20 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold font-headline text-on-surface dark:text-slate-100">
              {isFr ? 'Modifier le modèle' : 'Edit template'}
            </h3>
            <code className="text-[10px] text-on-surface-variant">{event.key}</code>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-low dark:bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setTab('edit')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-bold ${tab === 'edit' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              {isFr ? 'Édition' : 'Edit'}
            </button>
            <button
              onClick={() => setTab('preview')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-bold ${tab === 'preview' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-on-surface-variant'}`}
            >
              {isFr ? 'Aperçu' : 'Preview'}
            </button>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tokens hint */}
        <div className="shrink-0 px-6 pt-2 pb-2 text-[11px] text-on-surface-variant italic border-b border-outline-variant/10 dark:border-slate-700/50">
          {isFr
            ? 'Tokens : {{user.name}} {{actor.name}} {{invoice.amount}} {{invoice.clientName}} {{score}} {{date}} {{appUrl}}…'
            : 'Tokens: {{user.name}} {{actor.name}} {{invoice.amount}} {{invoice.clientName}} {{score}} {{date}} {{appUrl}}…'}
        </div>

        {/* Body — flex-1 with internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {tab === 'edit' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    FR
                  </span>
                  <span className="h-px bg-outline-variant/30 flex-1" />
                </div>
                <Field label={isFr ? 'Sujet' : 'Subject'} value={titleFr} onChange={setTitleFr} />
                <FieldArea label={isFr ? 'Corps' : 'Body'} value={bodyFr} onChange={setBodyFr} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    EN
                  </span>
                  <span className="h-px bg-outline-variant/30 flex-1" />
                </div>
                <Field label="Subject" value={titleEn} onChange={setTitleEn} />
                <FieldArea label="Body" value={bodyEn} onChange={setBodyEn} />
              </div>
            </div>
          ) : (
            <PreviewPane
              titleFr={titleFr}
              bodyFr={bodyFr}
              titleEn={titleEn}
              bodyEn={bodyEn}
              isFr={isFr}
            />
          )}
        </div>

        {/* Footer — always visible (sticky by virtue of flex layout) */}
        <div className="shrink-0 px-6 py-3 border-t border-outline-variant/20 dark:border-slate-700 flex justify-between items-center gap-2 bg-surface-container-low/50 dark:bg-slate-900/30">
          <p className="text-[11px] text-on-surface-variant hidden sm:block">
            {isFr
              ? 'Modifications appliquées immédiatement à toutes les futures notifications.'
              : 'Changes apply to every future notification immediately.'}
          </p>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-slate-700"
            >
              {isFr ? 'Annuler' : 'Cancel'}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-5 py-2 rounded-md bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? '…' : isFr ? 'Enregistrer' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PreviewPane({ titleFr, bodyFr, titleEn, bodyEn, isFr }) {
  const [side, setSide] = useState(isFr ? 'fr' : 'en');
  const subject = side === 'fr' ? titleFr : titleEn;
  const body = side === 'fr' ? bodyFr : bodyEn;
  return (
    <div className="space-y-3 h-full">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSide('fr')}
          className={`text-[11px] px-2.5 py-1 rounded-md font-bold ${side === 'fr' ? 'bg-primary text-white' : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant'}`}
        >
          FR
        </button>
        <button
          onClick={() => setSide('en')}
          className={`text-[11px] px-2.5 py-1 rounded-md font-bold ${side === 'en' ? 'bg-primary text-white' : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant'}`}
        >
          EN
        </button>
      </div>
      <div className="rounded-lg overflow-hidden border border-outline-variant/30">
        <div
          className="bg-[#002b4c] text-white px-5 py-3 text-[15px]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Tac-Tic ERM
        </div>
        <div className="p-5 bg-white dark:bg-slate-900">
          <h4 className="text-base font-bold text-[#0b1f33] dark:text-slate-100 mb-3">{subject}</h4>
          <pre className="text-sm whitespace-pre-wrap text-[#333] dark:text-slate-300 leading-relaxed font-sans">
            {body}
          </pre>
        </div>
        <div className="bg-[#f6f2ea] dark:bg-slate-800 px-5 py-2 text-[11px] text-[#888] text-center">
          © {new Date().getFullYear()} Tac-Tic ERM — Notification automatique
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-low dark:bg-slate-700 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
      />
    </div>
  );
}

function FieldArea({ label, value, onChange }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-h-[180px] w-full bg-surface-container-low dark:bg-slate-700 border border-outline-variant/30 rounded-lg py-2 px-3 text-sm font-mono text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
      />
    </div>
  );
}

function updateInGroups(grouped, updated) {
  const next = {};
  for (const [cat, list] of Object.entries(grouped)) {
    next[cat] = list.map((e) => (e.key === updated.key ? updated : e));
  }
  return next;
}
