/**
 * VerifyUpload.js
 * Public page — drop any PDF, we match it by SHA-256 against a stored
 * Tac-Tic ERM report and verify the signature.
 */
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function CheckRow({ ok, label, sub }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
        <span className={`material-symbols-outlined text-[14px] ${ok ? 'text-green-600' : 'text-red-500'}`}>
          {ok ? 'check' : 'close'}
        </span>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function VerifyUpload() {
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post(`${API}/verify/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setResult(null); setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-start py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00355f,#0f4c81)' }}>
          <span className="material-symbols-outlined text-white text-[20px]">upload_file</span>
        </div>
        <div>
          <div className="text-lg font-extrabold text-slate-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tac-Tic ERM
          </div>
          <div className="text-xs text-slate-500">Uploader un rapport pour vérifier son authenticité</div>
        </div>
      </div>

      <div className="w-full max-w-xl">
        {/* Upload zone */}
        {!result && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => pickFile(e.target.files?.[0])}
                className="hidden"
              />
              <span className="material-symbols-outlined text-[42px] text-slate-400">cloud_upload</span>
              <div className="text-sm font-semibold text-slate-700 mt-2">
                {file ? file.name : 'Glissez votre PDF ici ou cliquez pour parcourir'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {file ? formatSize(file.size) : 'PDF uniquement · 20 MB max'}
              </div>
            </div>

            {error && (
              <div className="mt-3 text-xs text-red-500 text-center">{error}</div>
            )}

            <div className="flex gap-2 mt-4">
              {file && (
                <button
                  onClick={reset}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  Retirer
                </button>
              )}
              <button
                onClick={submit}
                disabled={!file || loading}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#00355f,#0f4c81)' }}
              >
                {loading ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">fact_check</span>
                )}
                {loading ? 'Vérification…' : 'Vérifier'}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Main banner */}
            <div className={`rounded-2xl shadow-sm p-6 mb-4 ${
              result.verified
                ? 'bg-green-50 border border-green-200'
                : result.matched === false
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[40px] ${
                  result.verified ? 'text-green-500'
                    : result.matched === false ? 'text-orange-500'
                    : 'text-red-400'
                }`}>
                  {result.verified ? 'verified'
                    : result.matched === false ? 'edit_note'
                    : 'gpp_bad'}
                </span>
                <div>
                  <div className={`text-xl font-extrabold ${
                    result.verified ? 'text-green-700'
                      : result.matched === false ? 'text-orange-700'
                      : 'text-red-600'
                  }`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {result.verified
                      ? 'Rapport authentique ✓'
                      : result.matched === false
                        ? 'Aucun rapport Tac-Tic ne correspond'
                        : 'Vérification échouée'}
                  </div>
                  <div className={`text-sm ${
                    result.verified ? 'text-green-600'
                      : result.matched === false ? 'text-orange-600'
                      : 'text-red-500'
                  }`}>
                    {result.verified
                      ? 'La signature numérique et l\'intégrité du fichier sont valides.'
                      : result.matched === false
                        ? 'Le fichier a peut-être été modifié ou n\'a jamais été généré par Tac-Tic ERM.'
                        : 'Le fichier correspond à un rapport connu, mais la vérification a échoué.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload info */}
            {result.upload && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fichier uploadé</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Nom</span>
                    <span className="text-slate-800 font-medium text-right max-w-[280px] truncate">{result.upload.filename}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Taille</span>
                    <span className="text-slate-800 font-medium">{formatSize(result.upload.size)}</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SHA-256 calculé</div>
                  <div className="text-[10px] font-mono text-slate-600 break-all">{result.upload.hash}</div>
                </div>
              </div>
            )}

            {/* Matched report info */}
            {result.report && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Rapport correspondant</h3>
                <div className="space-y-1.5">
                  {[
                    ['Titre',       result.report.title],
                    ['Type',        result.report.type],
                    ['Période',     result.report.period],
                    ['Version',     `v${result.report.version}`],
                    ['Généré par',  result.report.generatedByName || result.report.signerCN || '—'],
                    ['Signé le',    result.report.signedAt ? new Date(result.report.signedAt).toLocaleString('fr-FR') : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-800 font-medium text-right max-w-[280px] truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checks */}
            {result.checks && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contrôles</h3>
                <CheckRow ok={result.checks.fileFound}      label="Fichier PDF correspondant trouvé" sub="Un rapport Tac-Tic ERM correspond au SHA-256 du fichier uploadé." />
                <CheckRow ok={result.checks.hashIntact}     label="Intégrité du document"            sub="Le SHA-256 actuel correspond au hash signé au moment de la génération." />
                <CheckRow ok={result.checks.signatureValid} label="Signature numérique valide"       sub="La signature RSA-SHA256 correspond au certificat Tac-Tic ERM." />
              </div>
            )}

            {/* TSA */}
            {result.tsa && result.tsa.status === 'ok' && (
              <div className="border rounded-xl p-4 flex items-start gap-3 bg-blue-50 border-blue-200 text-blue-700 mb-4">
                <span className="material-symbols-outlined text-[22px] mt-0.5">verified_user</span>
                <div>
                  <div className="font-semibold text-sm">Horodatage certifié — {result.tsa.issuer}</div>
                  <div className="text-xs mt-0.5 opacity-75">
                    RFC 3161 · eIDAS · {result.tsa.timestamp ? new Date(result.tsa.timestamp).toLocaleString('fr-FR') : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Vérifier un autre fichier
              </button>
            </div>
          </>
        )}

        <div className="text-center text-xs text-slate-400 mt-6">
          <p>Ce service de vérification est fourni par <strong>Tac-Tic ERM</strong>.</p>
          <p className="mt-1">Signature RSA-SHA256 + horodatage TSA (RFC 3161, eIDAS).</p>
          <Link to="/login" className="inline-block mt-3 text-blue-500 hover:underline">← Accéder à la plateforme</Link>
        </div>
      </div>
    </div>
  );
}
