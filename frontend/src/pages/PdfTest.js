/**
 * PdfTest.js
 * Dev sandbox — mounted at /pdfTEST.
 * Split single-screen view:
 *   LEFT  — Generate a freshly signed PDF (random signer name) + download
 *   RIGHT — Drop any PDF to run the full signature + SHA-256 check. If the
 *           file has been edited after signing the UI shows "MODIFIÉ".
 */
import { useState, useRef } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function PdfTest() {
  const { addToast } = useToast();
  const { lang } = useLang();

  // LEFT — generation
  const [generated, setGenerated] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [tamperNote, setTamperNote] = useState('');
  const [tampering, setTampering] = useState(false);
  const [tamperResult, setTamperResult] = useState(null);

  // RIGHT — verification
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ─────────────────────────── Generation ───────────────────────────
  const generate = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post('/dev/pdf-test/generate');
      setGenerated(data);
      setTamperResult(null);
      setTamperNote('');
      addToast('success',
        lang === 'fr' ? 'PDF signé généré' : 'Signed PDF generated',
        data.signerName);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setGenLoading(false);
    }
  };

  const openPdf = () => {
    if (!generated) return;
    const token = localStorage.getItem('token');
    window.open(`${API}/dev/pdf-test/${generated.id}?token=${token}`, '_blank');
  };

  const tamperPdf = async () => {
    if (!generated) return;
    setTampering(true);
    try {
      const { data } = await api.post(`/dev/pdf-test/${generated.id}/tamper`, { note: tamperNote });
      setTamperResult(data);
      addToast('success',
        lang === 'fr' ? 'PDF modifié' : 'PDF edited',
        lang === 'fr' ? 'Retéléchargez-le et vérifiez : il doit apparaître comme MODIFIÉ.' : 'Re-download and verify — it should appear as EDITED.');
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setTampering(false);
    }
  };

  const downloadPdf = async () => {
    if (!generated) return;
    const res = await api.get(`/dev/pdf-test/${generated.id}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_${generated.docId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ─────────────────────────── Verification ─────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      addToast('error', lang === 'fr' ? 'Fichier invalide' : 'Invalid file', 'PDF');
      return;
    }
    setVerifyFile(f);
    setVerifyResult(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const runVerify = async () => {
    if (!verifyFile) return;
    setVerifyLoading(true);
    try {
      const form = new FormData();
      form.append('file', verifyFile);
      const { data } = await axios.post(`${API}/verify/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ verified: false, error: err.response?.data?.error || 'network' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetVerify = () => {
    setVerifyFile(null);
    setVerifyResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─────────────────────────── Status chip ──────────────────────────
  const resultChip = () => {
    if (!verifyResult) return null;
    if (verifyResult.verified) return { label: lang === 'fr' ? 'AUTHENTIQUE' : 'AUTHENTIC', bg: 'bg-green-500', icon: 'verified' };
    if (verifyResult.matched === false) return { label: lang === 'fr' ? 'MODIFIÉ / INCONNU' : 'EDITED / UNKNOWN', bg: 'bg-orange-500', icon: 'edit_note' };
    if (verifyResult.reason === 'no_signature') return { label: lang === 'fr' ? 'NON SIGNÉ' : 'UNSIGNED', bg: 'bg-slate-500', icon: 'remove_moderator' };
    if (verifyResult.checks?.hashIntact === false) return { label: lang === 'fr' ? 'MODIFIÉ' : 'EDITED', bg: 'bg-orange-500', icon: 'edit_note' };
    return { label: lang === 'fr' ? 'ÉCHEC' : 'FAILED', bg: 'bg-red-500', icon: 'gpp_bad' };
  };
  const chip = resultChip();

  // ─────────────────────────── Render ───────────────────────────────
  return (
    <div>
      <section className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant">construction</span>
            <h2 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
              {lang === 'fr' ? 'Sandbox PDF signé' : 'Signed PDF sandbox'}
            </h2>
            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-widest">DEV</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            {lang === 'fr'
              ? 'Génère un PDF signé (nom aléatoire) puis dépose-le à droite pour vérifier. Modifie-le dans un éditeur et rejoue le test pour voir « Modifié ».'
              : 'Generate a signed PDF (random name) then drop it on the right to verify. Edit it in any tool and re-run the test to see "Edited".'}
          </p>
        </div>
      </section>

      {/* Split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[calc(100vh-220px)]">
        {/* ─────────── LEFT : Generate ─────────── */}
        <div className="rounded-2xl border border-surface-container-high dark:border-slate-700 bg-surface-container-lowest dark:bg-slate-800 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-blue-600">draw</span>
            <h3 className="text-sm font-extrabold font-headline uppercase tracking-widest text-on-surface dark:text-slate-100">
              {lang === 'fr' ? '1. Générer un PDF signé' : '1. Generate a signed PDF'}
            </h3>
          </div>

          <button
            onClick={generate}
            disabled={genLoading}
            className="group relative w-full overflow-hidden rounded-xl py-3 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#0f4c81,#00355f)' }}
          >
            <span aria-hidden="true" className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out" style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)' }} />
            <span className={`material-symbols-outlined text-[20px] relative ${genLoading ? 'animate-spin' : ''}`}>
              {genLoading ? 'progress_activity' : 'auto_awesome'}
            </span>
            <span className="relative">
              {genLoading
                ? (lang === 'fr' ? 'Génération…' : 'Generating…')
                : (lang === 'fr' ? 'Générer un PDF avec signataire aléatoire' : 'Generate PDF with random signer')}
            </span>
          </button>

          {!generated ? (
            <div className="mt-6 flex-1 flex flex-col items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[64px] opacity-30">picture_as_pdf</span>
              <p className="text-sm mt-2">
                {lang === 'fr' ? 'Aucun PDF généré. Clique le bouton ci-dessus.' : 'No PDF yet. Click the button above.'}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4 flex-1">
              {/* Signer highlight */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-800 p-5 border border-blue-100 dark:border-blue-900/40">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest mb-1">
                  {lang === 'fr' ? 'Signataire' : 'Signer'}
                </p>
                <p className="text-2xl font-extrabold font-headline text-on-surface dark:text-slate-100">{generated.signerName}</p>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {generated.docId} · {generated.issuedAt}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low dark:bg-slate-700/50 p-4">
                <div className="flex justify-between text-xs py-1.5 border-b border-surface-container-high dark:border-slate-600">
                  <span className="text-on-surface-variant">SHA-256</span>
                  <span className="font-mono text-on-surface dark:text-slate-200 max-w-[55%] truncate">{generated.hash?.slice(0, 20)}…</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-b border-surface-container-high dark:border-slate-600">
                  <span className="text-on-surface-variant">{lang === 'fr' ? 'Horodatage TSA' : 'TSA timestamp'}</span>
                  <span className="font-bold text-on-surface dark:text-slate-200">
                    {generated.tsaStatus === 'ok' ? `✓ ${generated.tsaIssuer || 'TSA'}` : (lang === 'fr' ? 'Indisponible' : 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1.5">
                  <span className="text-on-surface-variant">{lang === 'fr' ? 'Taille' : 'Size'}</span>
                  <span className="font-bold text-on-surface dark:text-slate-200">{fmtSize(generated.fileSize)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={openPdf}
                  className="flex-1 py-2 rounded-lg text-xs font-bold bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 hover:bg-surface-container-highest dark:hover:bg-slate-600 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  {lang === 'fr' ? 'Ouvrir' : 'Open'}
                </button>
                <button
                  onClick={downloadPdf}
                  className="flex-1 py-2 rounded-lg text-xs font-bold executive-gradient text-white flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  {lang === 'fr' ? 'Télécharger' : 'Download'}
                </button>
              </div>

              <p className="text-[11px] text-on-surface-variant text-center pt-2">
                👉 {lang === 'fr'
                  ? 'Télécharge-le, modifie-le avec n\'importe quel éditeur PDF, puis dépose-le à droite.'
                  : 'Download it, edit it with any PDF editor, then drop it on the right.'}
              </p>

              {/* Tamper panel — scenario helper */}
              <div className="rounded-xl border border-dashed border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-900/10 p-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[18px] text-red-600">edit_note</span>
                  <p className="text-[11px] font-extrabold text-red-700 dark:text-red-300 uppercase tracking-widest">
                    {lang === 'fr' ? 'Simuler une édition' : 'Simulate an edit'}
                  </p>
                </div>
                <p className="text-[11px] text-on-surface-variant mb-2">
                  {lang === 'fr'
                    ? 'Ajoute un bandeau rouge sur le document ET une page optionnelle avec ton texte. Le fichier sur disque change, la signature en base ne change pas → le prochain test détectera la falsification.'
                    : 'Adds a red banner to the document AND an optional extra page with your note. The file changes on disk, the signature in DB does not → the next check will flag tampering.'}
                </p>
                <textarea
                  rows="2"
                  value={tamperNote}
                  onChange={(e) => setTamperNote(e.target.value)}
                  placeholder={lang === 'fr'
                    ? 'Note à ajouter (optionnel) — ex. « Montant modifié de 10 000 à 50 000 TND »'
                    : 'Note to inject (optional) — e.g. "Amount changed from 10,000 to 50,000 TND"'}
                  className="w-full rounded-lg bg-white dark:bg-slate-700 border border-red-200 dark:border-red-900/40 p-2 text-xs text-on-surface dark:text-slate-200 resize-none focus:ring-2 focus:ring-red-400"
                />
                <button
                  onClick={tamperPdf}
                  disabled={tampering}
                  className="mt-2 w-full py-2 rounded-lg text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {tampering
                    ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[14px]">edit</span>}
                  {lang === 'fr' ? 'Modifier le PDF' : 'Edit the PDF'}
                </button>

                {tamperResult && (
                  <div className="mt-3 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/40 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[16px] text-red-600">warning</span>
                      <p className="text-[11px] font-bold text-red-700 dark:text-red-300">
                        {lang === 'fr' ? 'Fichier altéré sur le disque' : 'File altered on disk'}
                      </p>
                    </div>
                    <div className="flex justify-between text-[10px] py-1">
                      <span className="text-on-surface-variant">{lang === 'fr' ? 'Hash stocké' : 'Stored hash'}</span>
                      <span className="font-mono text-on-surface dark:text-slate-200">{tamperResult.storedHash?.slice(0, 16)}…</span>
                    </div>
                    <div className="flex justify-between text-[10px] py-1">
                      <span className="text-on-surface-variant">{lang === 'fr' ? 'Hash actuel' : 'Current hash'}</span>
                      <span className="font-mono text-red-600 dark:text-red-400">{tamperResult.currentHash?.slice(0, 16)}…</span>
                    </div>
                    <div className="flex justify-between text-[10px] py-1 pt-2 border-t border-red-100 dark:border-red-900/40 mt-1">
                      <span className="text-on-surface-variant">{lang === 'fr' ? 'Correspondance' : 'Match'}</span>
                      <span className={`font-bold ${tamperResult.hashMatches ? 'text-green-600' : 'text-red-600'}`}>
                        {tamperResult.hashMatches ? '✓' : '✗'} {tamperResult.hashMatches ? 'OK' : (lang === 'fr' ? 'MODIFIÉ' : 'EDITED')}
                      </span>
                    </div>
                    <button
                      onClick={downloadPdf}
                      className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">download</span>
                      {lang === 'fr' ? 'Télécharger la version modifiée' : 'Download the edited version'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─────────── RIGHT : Verify ─────────── */}
        <div className="rounded-2xl border border-surface-container-high dark:border-slate-700 bg-surface-container-lowest dark:bg-slate-800 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">fact_check</span>
            <h3 className="text-sm font-extrabold font-headline uppercase tracking-widest text-on-surface dark:text-slate-100">
              {lang === 'fr' ? '2. Vérifier un PDF' : '2. Verify a PDF'}
            </h3>
          </div>

          {/* Drop zone */}
          {!verifyResult && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-surface-container-high dark:border-slate-600 hover:border-blue-300 hover:bg-surface-container-low dark:hover:bg-slate-700/30'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                     onChange={(e) => pickFile(e.target.files?.[0])} />
              <span className="material-symbols-outlined text-[42px] text-on-surface-variant">cloud_upload</span>
              <div className="text-sm font-semibold text-on-surface dark:text-slate-200 mt-2">
                {verifyFile ? verifyFile.name : (lang === 'fr' ? 'Glissez votre PDF ici ou cliquez' : 'Drop your PDF here or click')}
              </div>
              <div className="text-[11px] text-on-surface-variant mt-0.5">
                {verifyFile ? fmtSize(verifyFile.size) : 'PDF · 20 MB max'}
              </div>
            </div>
          )}

          {verifyFile && !verifyResult && (
            <div className="flex gap-2 mt-3">
              <button onClick={resetVerify}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-surface-container-high dark:bg-slate-700 text-on-surface-variant">
                {lang === 'fr' ? 'Retirer' : 'Remove'}
              </button>
              <button onClick={runVerify} disabled={verifyLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-bold executive-gradient text-white flex items-center justify-center gap-1.5 disabled:opacity-60">
                {verifyLoading
                  ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[16px]">fact_check</span>}
                {lang === 'fr' ? 'Vérifier' : 'Verify'}
              </button>
            </div>
          )}

          {/* Result */}
          {verifyResult && chip && (
            <div className="mt-4 flex-1 flex flex-col">
              {/* Big status */}
              <div className={`rounded-xl p-5 text-white text-center shadow ${chip.bg}`}>
                <span className="material-symbols-outlined text-[40px]">{chip.icon}</span>
                <p className="text-xl font-extrabold font-headline mt-1">{chip.label}</p>
                <p className="text-xs opacity-90 mt-1">
                  {verifyResult.verified
                    ? (lang === 'fr' ? 'Le fichier correspond à un rapport Tac-Tic signé.' : 'The file matches a signed Tac-Tic report.')
                    : (verifyResult.matched === false
                        ? (lang === 'fr' ? 'Aucun rapport Tac-Tic ne correspond au SHA-256 du fichier — probablement modifié.' : 'No Tac-Tic report matches the file SHA-256 — likely edited.')
                        : (lang === 'fr' ? 'La vérification a échoué.' : 'Verification failed.'))}
                </p>
              </div>

              {/* Checks */}
              {verifyResult.checks && (
                <div className="mt-3 space-y-1.5 rounded-xl bg-surface-container-low dark:bg-slate-700/50 p-4">
                  {[
                    ['fileFound',       lang === 'fr' ? 'Fichier correspondant trouvé' : 'Matching file found'],
                    ['hashIntact',      lang === 'fr' ? 'Intégrité SHA-256'             : 'SHA-256 integrity'],
                    ['signatureValid',  lang === 'fr' ? 'Signature RSA valide'          : 'Valid RSA signature'],
                  ].map(([k, label]) => {
                    const ok = verifyResult.checks[k];
                    return (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className={`material-symbols-outlined text-[16px] ${ok ? 'text-green-600' : 'text-red-500'}`}>
                          {ok ? 'check_circle' : 'cancel'}
                        </span>
                        <span className="text-on-surface dark:text-slate-200">{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Matched report signer name */}
              {verifyResult.report?.generatedByName && (
                <div className="mt-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">
                    {lang === 'fr' ? 'Signataire détecté' : 'Detected signer'}
                  </p>
                  <p className="text-base font-extrabold text-on-surface dark:text-slate-200">{verifyResult.report.generatedByName}</p>
                  {verifyResult.tsa?.status === 'ok' && (
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1">
                      ✓ TSA {verifyResult.tsa.issuer} · {verifyResult.tsa.timestamp && new Date(verifyResult.tsa.timestamp).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                    </p>
                  )}
                </div>
              )}

              {/* Upload hash */}
              {verifyResult.upload?.hash && (
                <div className="mt-3 rounded-lg bg-surface-container-low dark:bg-slate-700/50 p-3">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">SHA-256 {lang === 'fr' ? 'calculé' : 'computed'}</p>
                  <p className="text-[10px] font-mono text-on-surface-variant break-all">{verifyResult.upload.hash}</p>
                </div>
              )}

              <div className="mt-auto pt-3">
                <button onClick={resetVerify}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 hover:bg-surface-container-highest dark:hover:bg-slate-600">
                  {lang === 'fr' ? 'Vérifier un autre PDF' : 'Verify another PDF'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
