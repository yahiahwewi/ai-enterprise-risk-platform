import { useRef, useState } from 'react';
import { useExtraction } from '../context/ExtractionContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

function ConfidenceBadge({ score }) {
  if (!score && score !== 0) return null;
  const pct = Math.round(score * 100);
  const cls = pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls} ml-1`}>{pct}%</span>;
}

export default function ExtractInvoice() {
  const { items, expandedId, setExpandedId, addFiles, updateForm, saveOne, saveAll, removeItem, clearAll, retryOne, startManual, setBulkInvoiceStatus } = useExtraction();
  const [dragOver, setDragOver] = useState(false);
  const [showWarnings, setShowWarnings] = useState({});
  const fileRef = useRef();
  const { addToast } = useToast();
  const { lang } = useLang();

  const l = lang === 'fr' ? {
    title: 'Extraction de Factures IA', subtitle: 'Importez un ou plusieurs PDF — l\'IA extrait automatiquement les données',
    dropzone: 'Glissez-déposez des fichiers PDF ici', or: 'ou', browse: 'Parcourir',
    maxSize: 'PDF uniquement, max 10 Mo par fichier · Import multiple autorisé',
    extracting: 'Extraction...', done: 'Extrait', error: 'Erreur', saved: 'Enregistré', queued: 'En attente',
    garbled: 'Non lisible', confirm: 'Confirmer', confirmAll: 'Tout enregistrer', cancel: 'Retirer',
    client: 'Client', invoiceNo: 'N° facture', totalTTC: 'Total TTC', issueDate: 'Émission',
    dueDate: 'Échéance', description: 'Description', totalHT: 'Total HT', tva: 'TVA',
    of: 'sur', manualEntry: 'Saisie manuelle', retry: 'Réessayer',
    verified: 'Vérifié par IA', savedMsg: 'Facture enregistrée', clearAll: 'Tout effacer',
  } : {
    title: 'AI Invoice Extraction', subtitle: 'Upload one or multiple PDFs — AI extracts data automatically',
    dropzone: 'Drag & drop PDF files here', or: 'or', browse: 'Browse',
    maxSize: 'PDF only, max 10MB per file · Multiple upload supported',
    extracting: 'Extracting...', done: 'Extracted', error: 'Error', saved: 'Saved', queued: 'Queued',
    garbled: 'Unreadable', confirm: 'Confirm', confirmAll: 'Save All', cancel: 'Remove',
    client: 'Client', invoiceNo: 'Invoice No.', totalTTC: 'Total TTC', issueDate: 'Issue Date',
    dueDate: 'Due Date', description: 'Description', totalHT: 'Total HT', tva: 'VAT',
    of: 'of', manualEntry: 'Manual entry', retry: 'Retry',
    verified: 'AI Verified', savedMsg: 'Invoice saved', clearAll: 'Clear all',
  };

  const statusIcon = { queued: 'schedule', extracting: 'hourglass_top', done: 'check_circle', error: 'error', saved: 'task_alt', garbled: 'warning' };
  const statusColor = { queued: 'text-slate-400', extracting: 'text-blue-500 animate-pulse', done: 'text-green-600', error: 'text-red-600', saved: 'text-green-700', garbled: 'text-amber-600' };
  const statusLabel = { queued: l.queued, extracting: l.extracting, done: l.done, error: l.error, saved: l.saved, garbled: l.garbled };

  const handleSave = async (id) => {
    const ok = await saveOne(id);
    addToast(ok ? 'success' : 'error', ok ? l.savedMsg : 'Error', '');
  };

  const handleSaveAll = async () => { await saveAll(); addToast('success', l.savedMsg, l.confirmAll); };

  const doneCount = items.filter(it => it.status === 'done' || it.status === 'saved').length;
  const savedCount = items.filter(it => it.status === 'saved').length;
  const extractingCount = items.filter(it => it.status === 'extracting').length;

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{l.title}</h2>
        <p className="text-on-surface-variant mt-2">{l.subtitle}</p>
      </section>

      {/* Upload zone */}
      <div
        className={`bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 text-center border-2 border-dashed transition-colors cursor-pointer mb-8 ${dragOver ? 'border-primary bg-blue-50 dark:bg-blue-900/10' : 'border-surface-container-high dark:border-slate-600 hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 block mb-3">upload_file</span>
        <p className="text-sm font-bold text-on-surface dark:text-slate-200 mb-1">{l.dropzone}</p>
        <p className="text-xs text-on-surface-variant mb-2">{l.or} <span className="text-primary font-bold">{l.browse}</span></p>
        <p className="text-[10px] text-on-surface-variant">{l.maxSize}</p>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-on-surface dark:text-slate-200">{doneCount} {l.of} {items.length} {l.done.toLowerCase()}</span>
            {extractingCount > 0 && <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse"><span className="material-symbols-outlined text-[14px]">hourglass_top</span>{extractingCount}</span>}
            {savedCount > 0 && <span className="text-xs text-green-600 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">task_alt</span>{savedCount} {l.saved.toLowerCase()}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk status selector */}
            {items.some(it => it.status === 'done') && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-on-surface-variant font-bold">{lang === 'fr' ? 'Statut pour tous:' : 'Status for all:'}</span>
                {['pending', 'paid'].map(s => (
                  <button key={s} onClick={() => setBulkInvoiceStatus(s)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors bg-surface-container-high dark:bg-slate-600 text-on-surface dark:text-slate-200 hover:bg-surface-container-highest">
                    {s === 'pending' ? (lang === 'fr' ? 'En attente' : 'Pending') : (lang === 'fr' ? 'Payée' : 'Paid')}
                  </button>
                ))}
              </div>
            )}
            {items.some(it => it.status === 'done') && (
              <button onClick={handleSaveAll} className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">save</span>{l.confirmAll}</button>
            )}
            <button onClick={clearAll} className="text-xs font-bold text-on-surface-variant hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{l.clearAll}</button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {items.map((item) => {
          const isOpen = expandedId === item.id;
          const r = item.result;
          const f = item.form;
          return (
            <div key={item.id} className={`bg-surface-container-low dark:bg-slate-700/50 rounded-xl overflow-hidden transition-all ${item.status === 'saved' ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors" onClick={() => setExpandedId(isOpen ? null : item.id)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`material-symbols-outlined text-[20px] ${statusColor[item.status]}`}>{statusIcon[item.status]}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{item.fileName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'done' ? 'bg-green-100 text-green-700' : item.status === 'saved' ? 'bg-green-100 text-green-800' : item.status === 'error' ? 'bg-red-100 text-red-700' : item.status === 'garbled' ? 'bg-amber-100 text-amber-700' : item.status === 'extracting' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel[item.status]}</span>
                      {r?.aiVerification?.verified && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">verified</span>{l.verified}</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">
                      {f?.clientName && `${f.clientName} · `}{f?.amount && `${Number(f.amount).toLocaleString('en-US', { minimumFractionDigits: 3 })} TND`}{f?.category && ` · ${f.category}`}
                      {item.status === 'error' && item.error}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-3">
                  {r?.confidence?.overall > 0 && <ConfidenceBadge score={r.confidence.overall} />}
                  <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-surface-container-high dark:border-slate-600">
                  {item.status === 'error' && <div className="py-4 text-center"><p className="text-sm text-red-600 mb-3">{item.error}</p><button onClick={() => retryOne(item.id)} className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg">{l.retry}</button></div>}
                  {item.status === 'garbled' && <div className="py-4 text-center"><p className="text-sm text-amber-600 mb-3">{r?.warnings?.[0]?.message}</p><div className="flex items-center justify-center gap-2"><button onClick={() => startManual(item.id)} className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit</span>{l.manualEntry}</button><button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-xs font-bold text-on-surface-variant px-3 py-2">{l.cancel}</button></div></div>}
                  {item.status === 'extracting' && <div className="py-6 text-center"><span className="material-symbols-outlined text-3xl text-blue-500 animate-pulse block mb-2">auto_awesome</span><p className="text-xs text-on-surface-variant">{l.extracting}</p></div>}
                  {(item.status === 'done' || item.status === 'saved') && f && (
                    <div className="pt-4 space-y-4">
                      {r?.warnings?.length > 0 && (
                        <div>
                          <button type="button" onClick={() => setShowWarnings(prev => ({ ...prev, [item.id]: !prev[item.id] }))} className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors">
                            <span className="material-symbols-outlined text-[14px]">{showWarnings[item.id] ? 'expand_less' : 'expand_more'}</span>
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            {r.warnings.length} {lang === 'fr' ? 'avertissement(s)' : 'warning(s)'}
                          </button>
                          {showWarnings[item.id] && <div className="space-y-1 mt-2 pl-5">{r.warnings.map((w, i) => <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600"><span className="material-symbols-outlined text-[12px] mt-0.5">warning</span>{w.message}</div>)}</div>}
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div><label className={labelCls}>{l.client} <ConfidenceBadge score={r?.confidence?.clientName} /></label><input type="text" value={f.clientName} onChange={(e) => updateForm(item.id, 'clientName', e.target.value)} className={`${inputCls} ${(r?.confidence?.clientName || 0) < 0.5 ? 'ring-2 ring-amber-400' : ''}`} disabled={item.status === 'saved'} /></div>
                        <div><label className={labelCls}>{l.invoiceNo} <ConfidenceBadge score={r?.confidence?.invoiceNumber} /></label><input type="text" value={f.reference} onChange={(e) => updateForm(item.id, 'reference', e.target.value)} className={inputCls} disabled={item.status === 'saved'} /></div>
                        <div><label className={labelCls}>{l.totalTTC} (TND) <ConfidenceBadge score={r?.confidence?.totalTTC} /></label><input type="number" step="0.001" value={f.amount} onChange={(e) => updateForm(item.id, 'amount', e.target.value)} className={`${inputCls} ${(r?.confidence?.totalTTC || 0) < 0.5 ? 'ring-2 ring-amber-400' : ''}`} disabled={item.status === 'saved'} /></div>
                        <div><label className={labelCls}>{l.issueDate}</label><input type="date" value={f.issueDate} onChange={(e) => updateForm(item.id, 'issueDate', e.target.value)} className={inputCls} disabled={item.status === 'saved'} /></div>
                        <div><label className={labelCls}>{l.dueDate}</label><input type="date" value={f.dueDate} onChange={(e) => updateForm(item.id, 'dueDate', e.target.value)} className={inputCls} disabled={item.status === 'saved'} /></div>
                        <div><label className={labelCls}>{l.description}</label><input type="text" value={f.description} onChange={(e) => updateForm(item.id, 'description', e.target.value)} className={inputCls} disabled={item.status === 'saved'} /></div>
                        <div>
                          <label className={labelCls}>{lang === 'fr' ? 'Catégorie' : 'Category'} {f.category && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-1">IA</span>}</label>
                          <select value={f.category || ''} onChange={(e) => updateForm(item.id, 'category', e.target.value)} className={inputCls} disabled={item.status === 'saved'}>
                            <option value="">{lang === 'fr' ? '— Sélectionner —' : '— Select —'}</option>
                            {(r?.availableCategories || []).map(c => <option key={c.value} value={lang === 'fr' ? c.label_fr : c.label_en}>{lang === 'fr' ? c.label_fr : c.label_en}</option>)}
                            {f.category && !(r?.availableCategories || []).some(c => c.label_fr === f.category || c.label_en === f.category) && (
                              <option value={f.category}>{f.category} (IA)</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>{lang === 'fr' ? 'Statut' : 'Status'}</label>
                          <select value={f.status} onChange={(e) => updateForm(item.id, 'status', e.target.value)} className={inputCls} disabled={item.status === 'saved'}>
                            <option value="pending">{lang === 'fr' ? 'En attente' : 'Pending'}</option>
                            <option value="paid">{lang === 'fr' ? 'Payée' : 'Paid'}</option>
                          </select>
                        </div>
                      </div>
                      {(r?.data?.totalHT || r?.data?.tva) && (
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surface-container-high dark:border-slate-600">
                          <div><p className="text-[9px] font-bold text-on-surface-variant uppercase">{l.totalHT}</p><p className="text-xs font-bold">{r.data.totalHT?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p></div>
                          <div><p className="text-[9px] font-bold text-on-surface-variant uppercase">{l.tva} ({r.data.tvaRate}%)</p><p className="text-xs font-bold">{r.data.tva?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p></div>
                          <div><p className="text-[9px] font-bold text-on-surface-variant uppercase">{l.totalTTC}</p><p className="text-xs font-bold">{r.data.totalTTC?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p></div>
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div className="flex items-center gap-2 pt-3 border-t border-surface-container-high dark:border-slate-600">
                          <button onClick={(e) => { e.stopPropagation(); handleSave(item.id); }} disabled={!f.clientName || !f.amount} className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check</span>{l.confirm}</button>
                          <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-xs font-bold text-on-surface-variant hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">{l.cancel}</button>
                        </div>
                      )}
                      {item.status === 'saved' && <div className="flex items-center gap-1 pt-2 text-green-600 text-xs font-bold"><span className="material-symbols-outlined text-[14px]">task_alt</span>{l.savedMsg}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
