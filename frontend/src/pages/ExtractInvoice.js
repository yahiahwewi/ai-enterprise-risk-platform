import { useState, useRef } from 'react';
import api from '../services/api';
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
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const { addToast } = useToast();
  const { lang } = useLang();

  const l = lang === 'fr' ? {
    title: 'Extraction de Facture IA', subtitle: 'Importez un PDF — l\'IA extrait automatiquement les données',
    dropzone: 'Glissez-déposez un PDF ici', or: 'ou', browse: 'Parcourir les fichiers',
    maxSize: 'PDF uniquement, max 10 Mo', extracting: 'Extraction en cours...',
    aiAnalyzing: 'L\'IA analyse le document...', preview: 'Données extraites — Vérifiez et modifiez',
    client: 'Nom du client', invoiceNo: 'N° de facture', issueDate: 'Date d\'émission',
    dueDate: 'Date d\'échéance', totalHT: 'Total HT', tvaRate: 'Taux TVA',
    tva: 'Montant TVA', totalTTC: 'Total TTC', description: 'Description',
    confirm: 'Confirmer et enregistrer', cancel: 'Annuler', retry: 'Réessayer',
    warnings: 'Avertissements', duplicates: 'Doublons potentiels', confidence: 'Confiance globale',
    detected: 'Langue détectée', pages: 'Pages', saved: 'Facture enregistrée avec succès',
    lowConfidence: 'Champs à faible confiance — vérifiez attentivement',
    clientMatch: 'Clients similaires trouvés',
  } : {
    title: 'AI Invoice Extraction', subtitle: 'Upload a PDF — AI automatically extracts the data',
    dropzone: 'Drag & drop a PDF here', or: 'or', browse: 'Browse files',
    maxSize: 'PDF only, max 10MB', extracting: 'Extracting...',
    aiAnalyzing: 'AI is analyzing the document...', preview: 'Extracted data — Review and edit',
    client: 'Client name', invoiceNo: 'Invoice number', issueDate: 'Issue date',
    dueDate: 'Due date', totalHT: 'Total excl. tax', tvaRate: 'VAT rate',
    tva: 'VAT amount', totalTTC: 'Total incl. tax', description: 'Description',
    confirm: 'Confirm & Save', cancel: 'Cancel', retry: 'Retry',
    warnings: 'Warnings', duplicates: 'Potential duplicates', confidence: 'Overall confidence',
    detected: 'Detected language', pages: 'Pages', saved: 'Invoice saved successfully',
    lowConfidence: 'Low confidence fields — review carefully',
    clientMatch: 'Similar clients found',
  };

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResult(null);
      setForm(null);
      extract(f);
    }
  };

  const extract = async (pdfFile) => {
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      const { data } = await api.post('/ai/extract-invoice', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data);
      setForm({
        clientName: data.data.clientName || '',
        amount: data.data.amount || data.data.totalTTC || '',
        issueDate: data.data.issueDate || '',
        dueDate: data.data.dueDate || '',
        description: data.data.description || '',
        reference: data.data.invoiceNumber || '',
        status: 'pending',
      });
    } catch (err) {
      addToast('error', 'Error', err.response?.data?.message || 'Extraction failed');
    }
    setExtracting(false);
  };

  const confirmAndSave = async () => {
    setSaving(true);
    try {
      await api.post('/invoices', { ...form, amount: Number(form.amount) });
      addToast('success', l.saved, form.clientName);
      setFile(null);
      setResult(null);
      setForm(null);
    } catch (err) {
      addToast('error', 'Error', err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const reset = () => { setFile(null); setResult(null); setForm(null); };

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{l.title}</h2>
        <p className="text-on-surface-variant mt-2">{l.subtitle}</p>
      </section>

      {/* Step 1: Upload zone */}
      {!result && !extracting && (
        <div
          className={`bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-12 text-center border-2 border-dashed transition-colors cursor-pointer ${dragOver ? 'border-primary bg-blue-50 dark:bg-blue-900/10' : 'border-surface-container-high dark:border-slate-600 hover:border-primary/50'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 block mb-4">upload_file</span>
          <p className="text-sm font-bold text-on-surface dark:text-slate-200 mb-1">{l.dropzone}</p>
          <p className="text-xs text-on-surface-variant mb-4">{l.or} <span className="text-primary font-bold cursor-pointer hover:underline">{l.browse}</span></p>
          <p className="text-[10px] text-on-surface-variant">{l.maxSize}</p>
        </div>
      )}

      {/* Step 2: Extracting loader */}
      {extracting && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-fixed dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="material-symbols-outlined text-primary text-[32px] filled">auto_awesome</span>
          </div>
          <p className="text-sm font-bold text-on-surface dark:text-slate-200 mb-1">{l.extracting}</p>
          <p className="text-xs text-on-surface-variant">{l.aiAnalyzing}</p>
        </div>
      )}

      {/* Step 3: Review & Edit */}
      {result && form && (
        <div className="space-y-6">
          {/* Meta bar */}
          <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-fixed dark:bg-blue-900/30 rounded-lg">
                <span className="material-symbols-outlined text-primary filled">auto_awesome</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface dark:text-slate-200">{l.preview}</p>
                <p className="text-xs text-on-surface-variant">{file?.name} · {result.pageCount} {l.pages} · {l.detected}: {result.data.detectedLanguage?.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">{l.confidence}:</span>
              <ConfidenceBadge score={result.confidence.overall} />
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{l.warnings}</p>
              <div className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="material-symbols-outlined text-amber-600 text-[14px] mt-0.5 shrink-0">warning</span>
                    <span className="text-amber-700 dark:text-amber-400">{w.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates */}
          {result.duplicates && (
            <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-r-xl">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">{l.duplicates}</p>
              {result.duplicates.possibleDuplicates.map((d, i) => (
                <p key={i} className="text-xs text-amber-600">{d.clientName} — {d.amount?.toLocaleString()} TND — {d.status} ({new Date(d.createdAt).toLocaleDateString()})</p>
              ))}
            </div>
          )}

          {/* Editable form */}
          <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{l.client} <ConfidenceBadge score={result.confidence.clientName} /></label>
                <input type="text" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className={`${inputCls} ${result.confidence.clientName < 0.5 ? 'ring-2 ring-amber-400' : ''}`} />
                {result.clientMatches?.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[9px] text-on-surface-variant">{l.clientMatch}:</p>
                    {result.clientMatches.map((m, i) => (
                      <button key={i} type="button" onClick={() => setForm({ ...form, clientName: m.label_fr })} className="block text-[10px] text-primary hover:underline">{m.label_fr}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>{l.invoiceNo} <ConfidenceBadge score={result.confidence.invoiceNumber} /></label>
                <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{l.totalTTC} (TND) <ConfidenceBadge score={result.confidence.totalTTC} /></label>
                <input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputCls} ${result.confidence.totalTTC < 0.5 ? 'ring-2 ring-amber-400' : ''}`} />
              </div>
              <div>
                <label className={labelCls}>{l.issueDate} <ConfidenceBadge score={result.confidence.issueDate} /></label>
                <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{l.dueDate} <ConfidenceBadge score={result.confidence.dueDate} /></label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={`${inputCls} ${result.confidence.dueDate < 0.5 ? 'ring-2 ring-amber-400' : ''}`} />
              </div>
              <div>
                <label className={labelCls}>{l.description}</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </div>
            </div>

            {/* Breakdown (read-only info) */}
            {(result.data.totalHT || result.data.tva) && (
              <div className="mt-4 pt-4 border-t border-surface-container-high dark:border-slate-600 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{l.totalHT}</p>
                  <p className="text-sm font-bold text-on-surface dark:text-slate-200">{result.data.totalHT?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{l.tva} ({result.data.tvaRate}%)</p>
                  <p className="text-sm font-bold text-on-surface dark:text-slate-200">{result.data.tva?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{l.totalTTC}</p>
                  <p className="text-sm font-bold text-on-surface dark:text-slate-200">{result.data.totalTTC?.toLocaleString('en-US', { minimumFractionDigits: 3 })} TND</p>
                </div>
              </div>
            )}

            {/* Line items */}
            {result.data.lineItems?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-container-high dark:border-slate-600">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{lang === 'fr' ? 'Lignes détectées' : 'Detected line items'}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr><th className="text-left text-[9px] text-on-surface-variant uppercase pb-2">Description</th><th className="text-right text-[9px] text-on-surface-variant uppercase pb-2">Qty</th><th className="text-right text-[9px] text-on-surface-variant uppercase pb-2">{lang === 'fr' ? 'P.U.' : 'Unit'}</th><th className="text-right text-[9px] text-on-surface-variant uppercase pb-2">Total</th></tr></thead>
                    <tbody>
                      {result.data.lineItems.map((li, i) => (
                        <tr key={i} className="border-t border-surface-container-high dark:border-slate-600">
                          <td className="py-1.5 text-on-surface dark:text-slate-300">{li.description}</td>
                          <td className="py-1.5 text-right">{li.quantity}</td>
                          <td className="py-1.5 text-right">{li.unitPrice?.toLocaleString()}</td>
                          <td className="py-1.5 text-right font-bold">{li.total?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-surface-container-high dark:border-slate-600">
              <button onClick={confirmAndSave} disabled={saving || !form.clientName || !form.amount} className="executive-gradient text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">{saving ? 'hourglass_top' : 'check'}</span>
                {saving ? '...' : l.confirm}
              </button>
              <button onClick={reset} className="bg-surface-container-high dark:bg-slate-600 text-on-surface dark:text-slate-200 text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-surface-container-highest transition-colors">
                {l.cancel}
              </button>
              <button onClick={() => extract(file)} className="text-sm text-primary font-bold hover:underline ml-auto flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">refresh</span>{l.retry}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
