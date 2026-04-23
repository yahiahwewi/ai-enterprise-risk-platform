import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { SkeletonKPIGrid } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const KIND_LABEL = {
  invoice:     { fr: 'Facture',     en: 'Invoice',     icon: 'description',       cls: 'bg-amber-100 text-amber-700' },
  transaction: { fr: 'Transaction', en: 'Transaction', icon: 'receipt_long',      cls: 'bg-blue-100 text-blue-700'   },
  loan:        { fr: 'Prêt',        en: 'Loan',        icon: 'account_balance',   cls: 'bg-violet-100 text-violet-700' },
  asset:       { fr: 'Actif',       en: 'Asset',       icon: 'inventory_2',       cls: 'bg-pink-100 text-pink-700'  },
  user:        { fr: 'Utilisateur', en: 'User',        icon: 'person',            cls: 'bg-rose-100 text-rose-700'  },
  report:      { fr: 'Rapport',     en: 'Report',      icon: 'picture_as_pdf',    cls: 'bg-teal-100 text-teal-700'  },
};

const SEVERITY_META = {
  info:           { fr: 'Information',      en: 'Info',              cls: 'bg-slate-100 text-slate-600',    icon: 'info' },
  finding:        { fr: 'Constatation',     en: 'Finding',           cls: 'bg-amber-100 text-amber-700',    icon: 'flag' },
  non_compliance: { fr: 'Non-conformité',   en: 'Non-compliance',    cls: 'bg-red-100 text-red-700',        icon: 'gavel' },
};

export default function InvestigationDetail() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add-link form
  const [pickKind, setPickKind] = useState('invoice');
  const [entityList, setEntityList] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [linkReason, setLinkReason] = useState('');
  const [linking, setLinking] = useState(false);

  // Add-note form
  const [noteText, setNoteText] = useState('');
  const [noteSeverity, setNoteSeverity] = useState('info');
  const [noting, setNoting] = useState(false);

  // Close panel
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [conclusion, setConclusion] = useState('');
  const [closing, setClosing] = useState(false);

  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/investigations/${id}`);
      setInv(data);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, lang]);

  useEffect(() => { load(); }, [load]);

  // Load entity list for the picker when kind changes
  useEffect(() => {
    const endpoint = {
      invoice:     '/invoices',
      transaction: '/transactions',
      loan:        '/loans',
      asset:       '/assets',
      user:        '/users',
      report:      '/export/pdf/history',
    }[pickKind];
    if (!endpoint) { setEntityList([]); return; }
    api.get(endpoint).then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data.reports || r.data.users || []);
      setEntityList(arr);
      setSelectedEntity('');
    }).catch(() => setEntityList([]));
  }, [pickKind]);

  const entityOptionLabel = (e) => {
    if (pickKind === 'invoice')     return `${e.clientName} · ${e.amount?.toLocaleString('fr-FR')} TND · ${e.status}`;
    if (pickKind === 'transaction') return `${e.type} · ${e.amount?.toLocaleString('fr-FR')} TND · ${e.category}`;
    if (pickKind === 'loan')        return `${e.amount?.toLocaleString('fr-FR')} TND @ ${e.interestRate}%`;
    if (pickKind === 'user')        return `${e.name} · ${e.email} · ${e.role}`;
    if (pickKind === 'report')      return `${e.title} · v${e.version}`;
    return e.name || e.title || e._id;
  };

  const addLink = async () => {
    if (!selectedEntity) return;
    setLinking(true);
    try {
      const { data } = await api.post(`/investigations/${id}/link`, {
        kind:     pickKind,
        entityId: selectedEntity,
        reason:   linkReason,
      });
      setInv(data);
      setSelectedEntity('');
      setLinkReason('');
      addToast('success', lang === 'fr' ? 'Entité liée' : 'Entity linked', '');
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally { setLinking(false); }
  };

  const unlink = async (linkId) => {
    try {
      const { data } = await api.delete(`/investigations/${id}/link/${linkId}`);
      setInv(data);
    } catch (err) { addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || ''); }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setNoting(true);
    try {
      const { data } = await api.post(`/investigations/${id}/notes`, { text: noteText, severity: noteSeverity });
      setInv(data);
      setNoteText('');
      setNoteSeverity('info');
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally { setNoting(false); }
  };

  const closeInvestigation = async () => {
    setClosing(true);
    try {
      const { data } = await api.post(`/investigations/${id}/close-and-export`, { conclusion });
      setInv(data.investigation);
      setShowCloseModal(false);
      addToast('success',
        lang === 'fr' ? 'Dossier signé et exporté' : 'Dossier signed and exported',
        lang === 'fr' ? 'Le PDF est accessible ci-dessous.' : 'The PDF is available below.');
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally { setClosing(false); }
  };

  const downloadSignedExport = () => {
    if (!inv?.exportReportId) return;
    const token = localStorage.getItem('token');
    window.open(`http://localhost:5000/api/export/pdf/${inv.exportReportId}?token=${token}`, '_blank');
  };

  if (loading || !inv) return (<div><SkeletonKPIGrid count={3} /></div>);

  const isClosed = inv.status === 'closed';

  return (
    <div>
      {/* Header */}
      <section className="mb-6">
        <Link to="/investigations" className="text-xs text-on-surface-variant hover:text-blue-600 flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          {lang === 'fr' ? 'Retour à la liste' : 'Back to list'}
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isClosed ? 'bg-slate-200 dark:bg-slate-700' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <span className={`material-symbols-outlined text-[26px] ${isClosed ? 'text-slate-500' : 'text-red-700'}`}>
              {isClosed ? 'task' : 'search'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
                {inv.title}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isClosed ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse'
              }`}>
                {isClosed ? (lang === 'fr' ? 'CLÔTURÉE' : 'CLOSED') : (lang === 'fr' ? 'OUVERTE' : 'OPEN')}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">{inv.subject}</p>
            <p className="text-[11px] text-on-surface-variant mt-1">
              {lang === 'fr' ? 'Auditeur' : 'Auditor'} : <strong>{inv.auditorName}</strong> · {lang === 'fr' ? 'Ouverte le' : 'Opened on'} {new Date(inv.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
              {inv.closedAt && ` · ${lang === 'fr' ? 'Clôturée le' : 'Closed on'} ${new Date(inv.closedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}`}
            </p>
          </div>
          {!isClosed && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 shadow"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {lang === 'fr' ? 'Clôturer & exporter' : 'Close & export'}
            </button>
          )}
        </div>
      </section>

      {/* Signed export banner */}
      {isClosed && inv.exportReportId && (
        <div className="mb-6 rounded-xl p-4 border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20 flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-green-600">verified</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-green-700 dark:text-green-300">
              {lang === 'fr' ? 'Dossier signé (RSA-SHA256 + TSA RFC 3161)' : 'Signed dossier (RSA-SHA256 + TSA RFC 3161)'}
            </p>
            <p className="text-[11px] text-green-700 dark:text-green-300 opacity-90">
              {lang === 'fr' ? 'Ce dossier est opposable : toute modification post-signature sera détectée par la page publique de vérification.' : 'Legally opposable: any post-signature edit will be detected by the public verify page.'}
            </p>
          </div>
          <button onClick={downloadSignedExport}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">download</span>
            {lang === 'fr' ? 'Télécharger' : 'Download'}
          </button>
          <Link to={`/verify/${inv.exportReportId}`} target="_blank"
                className="text-[11px] text-green-700 dark:text-green-300 hover:underline flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            {lang === 'fr' ? 'Page publique' : 'Public page'}
          </Link>
        </div>
      )}

      {/* Layout: entities left, timeline right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Entities */}
        <div className="lg:col-span-2 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-extrabold font-headline uppercase tracking-widest text-on-surface dark:text-slate-100 mb-3">
            {lang === 'fr' ? 'Entités liées' : 'Linked entities'} ({inv.linkedEntities.length})
          </h3>

          {!isClosed && (
            <div className="space-y-2 mb-4 pb-4 border-b border-surface-container-high dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <select value={pickKind} onChange={(e) => setPickKind(e.target.value)}
                        className="bg-surface-container-low dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs border-none text-on-surface dark:text-slate-200">
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{lang === 'fr' ? v.fr : v.en}</option>
                  ))}
                </select>
                <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}
                        className="bg-surface-container-low dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs border-none text-on-surface dark:text-slate-200">
                  <option value="">{lang === 'fr' ? 'Choisir…' : 'Pick…'}</option>
                  {entityList.slice(0, 200).map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>{entityOptionLabel(e)}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={linkReason}
                onChange={(e) => setLinkReason(e.target.value)}
                placeholder={lang === 'fr' ? 'Motif (ex. Montant anormal)' : 'Reason (e.g. Abnormal amount)'}
                className="w-full bg-surface-container-low dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs border-none text-on-surface dark:text-slate-200"
              />
              <button onClick={addLink} disabled={linking || !selectedEntity}
                      className="w-full executive-gradient text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60">
                <span className="material-symbols-outlined text-[14px]">add_link</span>
                {lang === 'fr' ? 'Rattacher' : 'Link'}
              </button>
            </div>
          )}

          {inv.linkedEntities.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic">
              {lang === 'fr' ? 'Aucune entité liée pour l\'instant.' : 'No linked entity yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {inv.linkedEntities.map((e) => {
                const meta = KIND_LABEL[e.kind];
                return (
                  <li key={e._id} className="p-3 rounded-lg bg-surface-container-low dark:bg-slate-700/50 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
                          {lang === 'fr' ? meta.fr : meta.en}
                        </span>
                        <p className="text-sm font-bold text-on-surface dark:text-slate-200 mt-1 truncate">{e.label}</p>
                        {e.reason && <p className="text-[11px] italic text-on-surface-variant mt-0.5">{e.reason}</p>}
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          {e.addedBy} · {new Date(e.addedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                        </p>
                      </div>
                      {!isClosed && (
                        <button onClick={() => unlink(e._id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-extrabold font-headline uppercase tracking-widest text-on-surface dark:text-slate-100 mb-3">
            {lang === 'fr' ? 'Chronologie des observations' : 'Timeline of observations'} ({inv.timeline.length})
          </h3>

          {!isClosed && (
            <div className="space-y-2 mb-4 pb-4 border-b border-surface-container-high dark:border-slate-700">
              <div className="flex gap-1.5">
                {Object.entries(SEVERITY_META).map(([k, v]) => (
                  <button key={k}
                          onClick={() => setNoteSeverity(k)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            noteSeverity === k ? v.cls + ' ring-2 ring-offset-1 ring-offset-surface-container-lowest' : 'border-transparent bg-surface-container-low dark:bg-slate-700/50 text-on-surface-variant'
                          }`}>
                    <span className="material-symbols-outlined text-[14px]">{v.icon}</span>
                    {lang === 'fr' ? v.fr : v.en}
                  </button>
                ))}
              </div>
              <textarea
                rows="2"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={lang === 'fr' ? 'Ajouter une observation horodatée…' : 'Add a timestamped observation…'}
                className="w-full bg-surface-container-low dark:bg-slate-700 rounded-lg p-2 text-sm border-none text-on-surface dark:text-slate-200 resize-none"
              />
              <button onClick={addNote} disabled={noting || !noteText.trim()}
                      className="w-full executive-gradient text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60">
                <span className="material-symbols-outlined text-[14px]">add_comment</span>
                {lang === 'fr' ? 'Ajouter à la chronologie' : 'Add to timeline'}
              </button>
            </div>
          )}

          <ol className="relative border-l border-surface-container-high dark:border-slate-700 ml-2 space-y-4">
            {[...inv.timeline].reverse().map((n) => {
              const meta = SEVERITY_META[n.severity] || SEVERITY_META.info;
              return (
                <li key={n._id} className="ml-4">
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full flex items-center justify-center ${meta.cls}`}>
                    <span className="material-symbols-outlined text-[10px]">{meta.icon}</span>
                  </span>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.cls}`}>
                      {lang === 'fr' ? meta.fr : meta.en}
                    </span>
                    <span className="text-[11px] font-bold text-on-surface dark:text-slate-200">{n.authorName}</span>
                    <span className="text-[10px] text-on-surface-variant">{new Date(n.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                  </div>
                  <p className="text-sm text-on-surface dark:text-slate-200 whitespace-pre-wrap">{n.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Close modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
             onClick={() => setShowCloseModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg goals-pop"
               onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 rounded-t-2xl"
                 style={{ background: 'linear-gradient(135deg,#b91c1c,#991b1b,#7f1d1d)' }}>
              <div className="flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-[28px]">verified</span>
                <div>
                  <h3 className="text-base font-extrabold">
                    {lang === 'fr' ? 'Clôturer & exporter l\'investigation' : 'Close & export investigation'}
                  </h3>
                  <p className="text-[11px] text-red-100 opacity-90">
                    {lang === 'fr' ? 'Génère un PDF signé RSA-SHA256 + TSA opposable' : 'Generates a signed RSA-SHA256 + TSA PDF'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {lang === 'fr' ? 'Conclusion de l\'auditeur' : 'Auditor\'s conclusion'}
              </label>
              <textarea
                rows="5"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder={lang === 'fr' ? 'Synthèse : faits établis, responsabilités, préconisations…' : 'Summary: established facts, responsibilities, recommendations…'}
                className="w-full bg-surface-container-low dark:bg-slate-700 rounded-lg p-3 text-sm border-none text-on-surface dark:text-slate-200 resize-none focus:ring-2 focus:ring-red-400"
              />
              <p className="text-xs text-on-surface-variant">
                {lang === 'fr'
                  ? 'Une fois clôturée, cette investigation ne peut plus être modifiée. Le PDF signé sera opposable.'
                  : 'Once closed, this investigation cannot be edited. The signed PDF will be legally opposable.'}
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => setShowCloseModal(false)} disabled={closing}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 disabled:opacity-50">
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button onClick={closeInvestigation} disabled={closing}
                      className="flex-1 py-2.5 rounded-lg text-sm font-extrabold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5 shadow disabled:opacity-60">
                {closing
                  ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[16px]">verified</span>}
                {lang === 'fr' ? 'Signer & clôturer' : 'Sign & close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
