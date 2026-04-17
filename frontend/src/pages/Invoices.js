import { useState, useEffect } from 'react';
import api from '../services/api';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';
import ComboInput from '../components/ComboInput';
import { SkeletonKPIGrid, SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import usePresets from '../services/usePresets';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";
const statusBadge = { paid: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', late: 'bg-red-100 text-red-700' };

/* ── Integrity shield badge ────────────────────────────────────────────────── */
function IntegrityBadge({ result, onClick, loading }) {
  if (loading) return (
    <button onClick={onClick} className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 animate-pulse" title="Checking…">
      <span className="material-symbols-outlined text-[14px]">progress_activity</span>
    </button>
  );
  if (!result) return (
    <button onClick={onClick} title="Check integrity" className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 hover:text-blue-500 transition-colors">
      <span className="material-symbols-outlined text-[16px]">shield</span>
    </button>
  );
  if (result.intact === null) return (
    <button onClick={onClick} title="No hash — created before integrity tracking" className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-500 transition-colors">
      <span className="material-symbols-outlined text-[16px]">shield</span>
    </button>
  );
  if (result.intact) return (
    <button onClick={onClick} title="Original — not modified" className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors">
      <span className="material-symbols-outlined text-[16px]">verified_user</span>
    </button>
  );
  return (
    <button onClick={onClick} title={`Modified — ${result.changedFields?.join(', ')}`} className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors">
      <span className="material-symbols-outlined text-[16px]">security</span>
    </button>
  );
}

/* ── Integrity detail modal ────────────────────────────────────────────────── */
function IntegrityModal({ data, onClose, lang }) {
  if (!data) return null;

  const FIELD_LABELS = {
    clientName: lang === 'fr' ? 'Client' : 'Client',
    amount:     lang === 'fr' ? 'Montant' : 'Amount',
    issueDate:  lang === 'fr' ? "Date d'émission" : 'Issue Date',
    dueDate:    lang === 'fr' ? "Date d'échéance" : 'Due Date',
    description: 'Description',
    reference:  lang === 'fr' ? 'Référence' : 'Reference',
    category:   lang === 'fr' ? 'Catégorie' : 'Category',
  };

  const intact = data.intact;
  const noHash = data.intact === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto goals-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`rounded-t-2xl px-6 py-5 flex items-center gap-3 ${
          noHash   ? 'bg-slate-100 dark:bg-slate-700' :
          intact   ? 'bg-green-50 dark:bg-green-900/20' :
                     'bg-orange-50 dark:bg-orange-900/20'
        }`}>
          <span className={`material-symbols-outlined text-[32px] ${
            noHash  ? 'text-slate-400' :
            intact  ? 'text-green-600' :
                      'text-orange-500'
          }`}>
            {noHash ? 'shield' : intact ? 'verified_user' : 'security'}
          </span>
          <div>
            <h3 className={`text-base font-extrabold font-headline ${
              noHash  ? 'text-slate-700 dark:text-slate-200' :
              intact  ? 'text-green-700 dark:text-green-300' :
                        'text-orange-700 dark:text-orange-300'
            }`}>
              {noHash
                ? (lang === 'fr' ? 'Non tracée' : 'Not tracked')
                : intact
                  ? (lang === 'fr' ? 'Facture originale ✓' : 'Original invoice ✓')
                  : (lang === 'fr' ? 'Facture modifiée !' : 'Invoice modified!')}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{data.clientName}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-black/10 transition-colors">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {noHash ? (
            <div className="text-sm text-on-surface-variant text-center py-4">
              <span className="material-symbols-outlined text-[40px] text-slate-300 block mb-2">info</span>
              {lang === 'fr'
                ? 'Cette facture a été créée avant l\'activation du suivi d\'intégrité. Aucune empreinte disponible.'
                : 'This invoice was created before integrity tracking was enabled. No fingerprint available.'}
            </div>
          ) : (
            <>
              {/* Hash comparison */}
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  {lang === 'fr' ? 'Empreinte SHA-256' : 'SHA-256 Fingerprint'}
                </p>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex gap-2">
                    <span className="text-on-surface-variant shrink-0 w-24">{lang === 'fr' ? 'Originale :' : 'Original:'}</span>
                    <span className="text-on-surface dark:text-slate-300 break-all">{data.storedHash?.slice(0, 24)}…{data.storedHash?.slice(-8)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-on-surface-variant shrink-0 w-24">{lang === 'fr' ? 'Actuelle :' : 'Current:'}</span>
                    <span className={`break-all ${intact ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {data.currentHash?.slice(0, 24)}…{data.currentHash?.slice(-8)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hashed at */}
              {data.hashedAt && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {lang === 'fr' ? 'Empreinte créée le' : 'Fingerprint created on'}{' '}
                  <strong>{new Date(data.hashedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</strong>
                </div>
              )}

              {/* Changed fields */}
              {!intact && data.changedFields?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">
                    {lang === 'fr' ? 'Champs modifiés' : 'Modified fields'}
                  </p>
                  <div className="space-y-2">
                    {data.changedFields.map((field) => (
                      <div key={field} className="bg-orange-50 dark:bg-orange-900/10 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-1">
                          {FIELD_LABELS[field] || field}
                        </p>
                        <div className="flex gap-4 text-xs">
                          <div>
                            <span className="text-on-surface-variant">{lang === 'fr' ? 'Avant: ' : 'Before: '}</span>
                            <span className="font-mono text-on-surface dark:text-slate-300 line-through opacity-75">
                              {String(data.snapshot?.[field] ?? '—')}
                            </span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant">{lang === 'fr' ? 'Après: ' : 'After: '}</span>
                            <span className="font-mono text-orange-700 dark:text-orange-300 font-bold">
                              {String(data.currentSnapshot?.[field] ?? '—')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All tracked fields (when intact) */}
              {intact && data.snapshot && (
                <div>
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-2">
                    {lang === 'fr' ? 'Champs vérifiés (non modifiés)' : 'Verified fields (unchanged)'}
                  </p>
                  <div className="space-y-1">
                    {Object.entries(data.snapshot).map(([field, val]) => (
                      <div key={field} className="flex justify-between text-xs py-1 border-b border-surface-container-high dark:border-slate-700 last:border-0">
                        <span className="text-on-surface-variant">{FIELD_LABELS[field] || field}</span>
                        <span className="font-medium text-on-surface dark:text-slate-300 max-w-[220px] truncate text-right">{String(val || '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 hover:bg-surface-container-highest dark:hover:bg-slate-600 transition-colors"
          >
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk integrity modal ──────────────────────────────────────────────────── */
function BulkIntegrityModal({ data, onClose, lang }) {
  if (!data) return null;
  const { summary, invoices } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto goals-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-container-high dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[26px] text-blue-600">fact_check</span>
            <div>
              <h3 className="text-base font-extrabold font-headline text-on-surface dark:text-slate-100">
                {lang === 'fr' ? 'Audit d\'intégrité global' : 'Global Integrity Audit'}
              </h3>
              <p className="text-xs text-on-surface-variant">{summary.total} {lang === 'fr' ? 'facture(s) vérifiée(s)' : 'invoice(s) checked'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3 px-6 pt-5 pb-3">
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
            <p className="text-2xl font-extrabold text-green-600">{summary.original}</p>
            <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mt-0.5">
              {lang === 'fr' ? 'Originales' : 'Original'}
            </p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-3 text-center">
            <p className="text-2xl font-extrabold text-orange-500">{summary.modified}</p>
            <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mt-0.5">
              {lang === 'fr' ? 'Modifiées' : 'Modified'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 p-3 text-center">
            <p className="text-2xl font-extrabold text-slate-500">{summary.untracked}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {lang === 'fr' ? 'Non tracées' : 'Untracked'}
            </p>
          </div>
        </div>

        {/* Invoice list */}
        <div className="px-6 pb-6 space-y-1.5">
          {invoices.map((inv) => {
            const isModified  = inv.intact === false;
            const isOriginal  = inv.intact === true;
            return (
              <div key={inv.invoiceId} className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                isModified ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800' :
                isOriginal ? 'bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900' :
                             'bg-surface-container-low dark:bg-slate-700/40 border border-transparent'
              }`}>
                <span className={`material-symbols-outlined text-[18px] shrink-0 ${
                  isModified ? 'text-orange-500' : isOriginal ? 'text-green-600' : 'text-slate-400'
                }`}>
                  {isModified ? 'security' : isOriginal ? 'verified_user' : 'shield'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{inv.clientName}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {inv.reference && `Réf: ${inv.reference} · `}
                    {inv.amount?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND
                  </p>
                </div>
                {isModified && inv.changedFields?.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {inv.changedFields.map((f) => (
                      <span key={f} className="text-[9px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  isModified ? 'bg-orange-100 text-orange-700' :
                  isOriginal ? 'bg-green-100 text-green-700' :
                               'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'
                }`}>
                  {isModified ? (lang === 'fr' ? 'Modifiée' : 'Modified') :
                   isOriginal ? (lang === 'fr' ? 'Originale' : 'Original') :
                                (lang === 'fr' ? 'Non tracée' : 'Untracked')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════════ */
export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ clientName: '', amount: '', dueDate: '', issueDate: '', status: 'pending', description: '', reference: '', notes: '' });
  const [showMore, setShowMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Integrity state
  const [integrityCache, setIntegrityCache]     = useState({});   // { [id]: result }
  const [checkingId, setCheckingId]             = useState(null);
  const [integrityModal, setIntegrityModal]     = useState(null); // single invoice result
  const [bulkModal, setBulkModal]               = useState(null); // bulk result
  const [checkingAll, setCheckingAll]           = useState(false);

  const { addToast } = useToast();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const isAuditor = user?.role === 'auditor';
  const clientOptions = usePresets('client', invoices.map((i) => i.clientName));

  const fetchInvoices = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/invoices${params}`).then((r) => setInvoices(r.data)).catch(() => addToast('error', t('toast.error'), t('toast.failed'))).finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvoices(); }, [statusFilter]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/invoices', { ...form, amount: Number(form.amount) });
      setInvoices([data, ...invoices]);
      setForm({ clientName: '', amount: '', dueDate: '', issueDate: '', status: 'pending', description: '', reference: '', notes: '' });
      setShowMore(false);
      addToast('success', t('toast.invoiceCreated'), `${form.clientName}`);
    } catch (err) { addToast('error', t('toast.error'), err.response?.data?.message || t('toast.failed')); }
  };

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/invoices/${id}`, { status });
      setInvoices(invoices.map((inv) => (inv._id === id ? data : inv)));
      // invalidate integrity cache for this invoice (status change doesn't affect integrity fields
      // but user might want to re-check)
      addToast('success', t('toast.updated'), status);
    } catch { addToast('error', t('toast.error'), t('toast.failed')); }
  };

  const deleteInvoice = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(invoices.filter((inv) => inv._id !== id));
      setDeleting(null);
      addToast('success', lang === 'fr' ? 'Facture supprimée' : 'Invoice deleted', '');
    } catch { addToast('error', t('toast.error'), t('toast.failed')); }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((i) => i._id)));
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const results = await Promise.allSettled(ids.map((id) => api.delete(`/invoices/${id}`)));
    const okIds = ids.filter((_, i) => results[i].status === 'fulfilled');
    const failed = ids.length - okIds.length;
    setInvoices((prev) => prev.filter((inv) => !okIds.includes(inv._id)));
    setSelectedIds(new Set());
    setBulkConfirm(false);
    setBulkDeleting(false);
    setSelectMode(false);
    if (failed === 0) {
      addToast('success', lang === 'fr' ? 'Factures supprimées' : 'Invoices deleted', `${okIds.length}`);
    } else {
      addToast('error', t('toast.error'), lang === 'fr'
        ? `${okIds.length} supprimée(s), ${failed} échec`
        : `${okIds.length} deleted, ${failed} failed`);
    }
  };

  const downloadPDF = (id, clientName) => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:5000/api/export/invoice-pdf/${id}?language=${lang}&token=${token}`;
    window.open(url, '_blank');
  };

  /* ── Integrity helpers ── */
  const checkIntegrity = async (id, e) => {
    if (e) e.stopPropagation();
    setCheckingId(id);
    try {
      const { data } = await api.get(`/invoices/${id}/integrity`);
      setIntegrityCache((prev) => ({ ...prev, [id]: data }));
      setIntegrityModal(data);
    } catch {
      addToast('error', t('toast.error'), lang === 'fr' ? 'Impossible de vérifier l\'intégrité' : 'Could not check integrity');
    } finally {
      setCheckingId(null);
    }
  };

  const checkAllIntegrity = async () => {
    setCheckingAll(true);
    try {
      const { data } = await api.get('/invoices/integrity/all');
      // Populate cache
      const newCache = {};
      for (const inv of data.invoices) {
        newCache[inv.invoiceId] = inv;
      }
      setIntegrityCache((prev) => ({ ...prev, ...newCache }));
      setBulkModal(data);
    } catch {
      addToast('error', t('toast.error'), lang === 'fr' ? 'Audit impossible' : 'Audit failed');
    } finally {
      setCheckingAll(false);
    }
  };

  const statusLabels = { fr: { all: 'Toutes', paid: 'Payées', pending: 'En attente', late: 'En retard' }, en: { all: 'All', paid: 'Paid', pending: 'Pending', late: 'Late' } };
  const sl = statusLabels[lang] || statusLabels.fr;

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t('invoicesPage.title')}</h2></section><SkeletonKPIGrid count={3} /><SkeletonTable /></div>);

  return (
    <div>
      <ReadOnlyBanner />
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t('invoicesPage.title')}</h2>
        <p className="text-on-surface-variant mt-2">{t('invoicesPage.subtitle')}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <KPICard label={t('invoicesPage.paid')} value={invoices.filter((i) => i.status === 'paid').length} icon="check_circle" iconColor="green" />
        <KPICard label={t('invoicesPage.pending')} value={invoices.filter((i) => i.status === 'pending').length} icon="schedule" iconColor="yellow" />
        <KPICard label={t('invoicesPage.late')} value={invoices.filter((i) => i.status === 'late').length} icon="warning" iconColor="red" />
      </div>

      {/* Create Invoice Form — hidden for auditors (read-only) */}
      {!isAuditor && (
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{t('invoicesPage.newInvoice')}</h3>
        <form onSubmit={add} className="space-y-4">
          {/* Required fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>{t('accountant.client')} *</label>
              <ComboInput value={form.clientName} onChange={(val) => setForm({ ...form, clientName: val })} options={clientOptions} placeholder={t('accountant.selectClient')} label="client" required />
            </div>
            <div>
              <label className={labelCls}>{t('common.amount')} (TND) *</label>
              <input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.000" required min="0" />
            </div>
            <div>
              <label className={labelCls}>{t('accountant.dueDate')} *</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>{t('common.status')}</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                <option value="pending">{sl.pending}</option>
                <option value="paid">{sl.paid}</option>
              </select>
            </div>
          </div>

          {/* Toggle for optional fields */}
          <button type="button" onClick={() => setShowMore(!showMore)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-container transition-colors">
            <span className="material-symbols-outlined text-[16px]">{showMore ? 'expand_less' : 'expand_more'}</span>
            {showMore
              ? (lang === 'fr' ? 'Masquer les détails' : 'Hide details')
              : (lang === 'fr' ? 'Ajouter des détails (optionnel)' : 'Add details (optional)')
            }
          </button>

          {/* Optional fields — collapsible */}
          {showMore && (
            <div className="border-t border-surface-container-high dark:border-slate-700 pt-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>{lang === 'fr' ? "Date d'émission" : 'Issue Date'}</label>
                  <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputCls} />
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{lang === 'fr' ? "Par défaut : aujourd'hui" : 'Default: today'}</p>
                </div>
                <div>
                  <label className={labelCls}>{lang === 'fr' ? 'Référence' : 'Reference'}</label>
                  <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} placeholder={lang === 'fr' ? 'N° bon de commande, contrat...' : 'PO number, contract...'} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder={lang === 'fr' ? 'Prestation, livraison...' : 'Service, delivery...'} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{lang === 'fr' ? 'Notes internes' : 'Internal Notes'}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls + ' resize-none'} rows="2" placeholder={lang === 'fr' ? 'Notes visibles uniquement en interne...' : 'Notes visible only internally...'} />
              </div>
            </div>
          )}

          <button type="submit" className="executive-gradient text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:opacity-90 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t('invoicesPage.createInvoice')}
          </button>
        </form>
      </div>
      )}

      {/* Invoice List */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100">{t('invoicesPage.all')}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Select mode toggle — hidden for auditors */}
            {!isAuditor && (<>
            <button
              onClick={() => { setSelectMode((m) => !m); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                selectMode
                  ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{selectMode ? 'close' : 'checklist'}</span>
              {selectMode
                ? (lang === 'fr' ? 'Annuler' : 'Cancel')
                : (lang === 'fr' ? 'Sélectionner' : 'Select')}
            </button>

            {/* Bulk delete — visible only when selectMode and at least one selected */}
            {selectMode && selectedIds.size > 0 && (
              bulkConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400">
                    {lang === 'fr' ? `Supprimer ${selectedIds.size} ?` : `Delete ${selectedIds.size}?`}
                  </span>
                  <button
                    onClick={bulkDelete}
                    disabled={bulkDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-60"
                  >
                    {bulkDeleting
                      ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      : <span className="material-symbols-outlined text-[14px]">delete</span>
                    }
                    {lang === 'fr' ? 'Confirmer' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setBulkConfirm(false)}
                    disabled={bulkDeleting}
                    className="text-xs font-bold text-on-surface-variant hover:text-on-surface px-2 py-1.5"
                  >
                    {lang === 'fr' ? 'Non' : 'No'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setBulkConfirm(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                  {lang === 'fr'
                    ? `Supprimer (${selectedIds.size})`
                    : `Delete (${selectedIds.size})`}
                </button>
              )
            )}

            {/* Select all (only visible in select mode) */}
            {selectMode && invoices.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {selectedIds.size === invoices.length ? 'deselect' : 'select_all'}
                </span>
                {selectedIds.size === invoices.length
                  ? (lang === 'fr' ? 'Tout désélectionner' : 'Deselect all')
                  : (lang === 'fr' ? 'Tout sélectionner' : 'Select all')}
              </button>
            )}
            </>)}

            {/* Integrity audit button */}
            <button
              onClick={checkAllIntegrity}
              disabled={checkingAll}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
            >
              {checkingAll
                ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[15px]">fact_check</span>
              }
              {lang === 'fr' ? 'Audit intégrité' : 'Integrity audit'}
            </button>
            {/* Status filters */}
            <div className="flex gap-1">
              {[['', sl.all], ['paid', sl.paid], ['pending', sl.pending], ['late', sl.late]].map(([val, label]) => (
                <button key={val} onClick={() => setStatusFilter(val)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${statusFilter === val ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {invoices.length === 0 ? (
          <EmptyState icon="description" title={t('invoicesPage.noData')} message={t('invoicesPage.noDataMsg')} />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const isOpen = expanded === inv._id;
              const isPendingApproval = inv.workflowStatus === 'pending_approval';
              const isRejected = inv.workflowStatus === 'rejected';
              const statusIcon = { paid: 'check_circle', pending: 'schedule', late: 'warning' };
              const statusColorIcon = { paid: 'text-green-600', pending: 'text-amber-600', late: 'text-red-600' };
              const statusBg = { paid: 'bg-green-100 dark:bg-green-900/30', pending: 'bg-amber-100 dark:bg-amber-900/30', late: 'bg-red-100 dark:bg-red-900/30' };
              const cachedIntegrity = integrityCache[inv._id];

              return (
                <div key={inv._id} className={`rounded-xl overflow-hidden transition-all ${
                  selectMode && selectedIds.has(inv._id)
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-400/60'
                    : 'bg-surface-container-low dark:bg-slate-700/50'
                }`}>
                  {/* Main row — clickable */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors"
                    onClick={() => {
                      if (selectMode) { toggleSelect(inv._id); } else { setExpanded(isOpen ? null : inv._id); }
                    }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv._id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(inv._id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                          aria-label="select invoice"
                        />
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPendingApproval ? 'bg-purple-100 dark:bg-purple-900/30' : isRejected ? 'bg-red-100 dark:bg-red-900/30' : statusBg[inv.status]}`}>
                        <span className={`material-symbols-outlined text-[20px] ${isPendingApproval ? 'text-purple-600' : isRejected ? 'text-red-600' : statusColorIcon[inv.status]}`}>
                          {isPendingApproval ? 'hourglass_top' : isRejected ? 'block' : statusIcon[inv.status]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{inv.clientName}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[inv.status]}`}>{sl[inv.status] || inv.status}</span>
                          {isPendingApproval && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                              {lang === 'fr' ? 'En attente d\'approbation' : 'Pending approval'}
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">block</span>
                              {lang === 'fr' ? 'Rejeté' : 'Rejected'}
                            </span>
                          )}
                          {/* Integrity badge — always visible on the row */}
                          <span onClick={(e) => e.stopPropagation()}>
                            <IntegrityBadge
                              result={cachedIntegrity}
                              loading={checkingId === inv._id}
                              onClick={(e) => checkIntegrity(inv._id, e)}
                            />
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant truncate">
                          INV-{String(inv._id).slice(-6).toUpperCase()} · {lang === 'fr' ? 'Échéance' : 'Due'}: {new Date(inv.dueDate).toLocaleDateString()}
                          {inv.category && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 ml-1">{inv.category}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-4">
                      <span className="text-sm font-bold font-headline text-on-surface dark:text-slate-100">
                        {inv.amount.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND
                      </span>
                      <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-surface-container-high dark:border-slate-600">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{t('accountant.client')}</p>
                          <p className="text-sm font-bold text-on-surface dark:text-slate-200">{inv.clientName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{t('common.amount')}</p>
                          <p className="text-sm font-bold text-on-surface dark:text-slate-200">{inv.amount.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{lang === 'fr' ? "Date d'émission" : 'Issue Date'}</p>
                          <p className="text-sm text-on-surface dark:text-slate-300">{new Date(inv.issueDate || inv.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{t('accountant.dueDate')}</p>
                          <p className="text-sm text-on-surface dark:text-slate-300">{new Date(inv.dueDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>

                      {(inv.description || inv.reference || inv.notes) && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                          {inv.description && (
                            <div>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Description</p>
                              <p className="text-sm text-on-surface dark:text-slate-300">{inv.description}</p>
                            </div>
                          )}
                          {inv.reference && (
                            <div>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{lang === 'fr' ? 'Référence' : 'Reference'}</p>
                              <p className="text-sm text-on-surface dark:text-slate-300">{inv.reference}</p>
                            </div>
                          )}
                          {inv.notes && (
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">{lang === 'fr' ? 'Notes' : 'Notes'}</p>
                              <p className="text-sm text-on-surface-variant">{inv.notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-container-high dark:border-slate-600 flex-wrap">
                        {!isAuditor && (inv.status === 'pending' || inv.status === 'late') && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv._id, 'paid'); }} className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            {t('common.markPaid')}
                          </button>
                        )}
                        {!isAuditor && inv.status === 'pending' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv._id, 'late'); }} className="bg-surface-container-high dark:bg-slate-600 text-on-surface dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container-highest transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {t('invoicesPage.markLate')}
                          </button>
                        )}
                        {!isAuditor && inv.status === 'paid' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv._id, 'pending'); }} className="bg-surface-container-high dark:bg-slate-600 text-on-surface dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-surface-container-highest transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">undo</span>
                            {lang === 'fr' ? 'Annuler paiement' : 'Undo Payment'}
                          </button>
                        )}

                        {inv.originalPdf ? (
                          <button onClick={(e) => { e.stopPropagation(); const token = localStorage.getItem('token'); window.open(`http://localhost:5000/api/ai/invoice-pdf/${inv.originalPdf}?token=${token}`, '_blank'); }} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                            {lang === 'fr' ? 'Original PDF' : 'Original PDF'}
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); downloadPDF(inv._id, inv.clientName); }} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                            {lang === 'fr' ? 'Générer PDF' : 'Generate PDF'}
                          </button>
                        )}

                        {/* Integrity check button (in expanded details) */}
                        <button
                          onClick={(e) => { e.stopPropagation(); checkIntegrity(inv._id, e); }}
                          disabled={checkingId === inv._id}
                          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                        >
                          {checkingId === inv._id
                            ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            : <span className="material-symbols-outlined text-[14px]">verified_user</span>
                          }
                          {lang === 'fr' ? 'Vérifier intégrité' : 'Check integrity'}
                        </button>

                        {!isAuditor && (deleting === inv._id ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-xs text-on-surface-variant mr-1">{lang === 'fr' ? 'Supprimer ?' : 'Delete?'}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteInvoice(inv._id); }} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">
                              {lang === 'fr' ? 'Oui' : 'Yes'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleting(null); }} className="text-xs font-bold text-on-surface-variant hover:text-on-surface px-2 py-1.5">
                              {lang === 'fr' ? 'Non' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setDeleting(inv._id); }} className="ml-auto text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            {lang === 'fr' ? 'Supprimer' : 'Delete'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Integrity detail modal */}
      {integrityModal && (
        <IntegrityModal data={integrityModal} onClose={() => setIntegrityModal(null)} lang={lang} />
      )}

      {/* Bulk integrity modal */}
      {bulkModal && (
        <BulkIntegrityModal data={bulkModal} onClose={() => setBulkModal(null)} lang={lang} />
      )}
    </div>
  );
}
