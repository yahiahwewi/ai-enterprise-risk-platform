/**
 * VerifyReport.js
 * Layer 3 — Public, unauthenticated page.
 * Anyone can open /verify/:id to check if a Tac-Tic ERM report is authentic.
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

function TSABadge({ status, issuer, timestamp }) {
  if (status === 'ok') return (
    <div className="border rounded-xl p-4 flex items-start gap-3 bg-blue-50 border-blue-200 text-blue-700">
      <span className="material-symbols-outlined text-[22px] mt-0.5">verified_user</span>
      <div>
        <div className="font-semibold text-sm">Horodatage certifié — {issuer}</div>
        <div className="text-xs mt-0.5 opacity-75">
          RFC 3161 · eIDAS · {timestamp ? new Date(timestamp).toLocaleString('fr-FR') : ''}
        </div>
        <div className="text-[10px] mt-1 opacity-60">Même standard qu'Adobe Acrobat et DocuSign. Instantané.</div>
      </div>
    </div>
  );
  if (status === 'failed') return (
    <div className="border rounded-xl p-4 flex items-start gap-3 bg-slate-50 border-slate-200 text-slate-500">
      <span className="material-symbols-outlined text-[22px] mt-0.5">timer_off</span>
      <div>
        <div className="font-semibold text-sm">Horodatage TSA indisponible</div>
        <div className="text-xs mt-0.5 opacity-75">Le serveur TSA n'a pas répondu lors de la génération.</div>
      </div>
    </div>
  );
  return null;
}

export default function VerifyReport() {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API}/verify/${id}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Erreur réseau'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-start py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00355f,#0f4c81)' }}>
          <span className="material-symbols-outlined text-white text-[20px]">verified</span>
        </div>
        <div>
          <div className="text-lg font-extrabold text-slate-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tac-Tic ERM
          </div>
          <div className="text-xs text-slate-500">Vérification de rapport certifié</div>
        </div>
      </div>

      <div className="w-full max-w-xl">
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-3 text-slate-400">
            <span className="material-symbols-outlined text-[40px] animate-spin">progress_activity</span>
            <div className="text-sm">Vérification en cours…</div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <span className="material-symbols-outlined text-[48px] text-red-400">error</span>
            <div className="text-lg font-bold text-slate-700 mt-3">Rapport introuvable</div>
            <div className="text-sm text-slate-500 mt-1">{error}</div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Main result */}
            <div className={`rounded-2xl shadow-sm p-6 mb-4 ${data.verified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`material-symbols-outlined text-[40px] ${data.verified ? 'text-green-500' : 'text-red-400'}`}>
                  {data.verified ? 'verified' : 'gpp_bad'}
                </span>
                <div>
                  <div className={`text-xl font-extrabold ${data.verified ? 'text-green-700' : 'text-red-600'}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {data.verified ? 'Rapport authentique ✓' : 'Vérification échouée'}
                  </div>
                  <div className={`text-sm ${data.verified ? 'text-green-600' : 'text-red-500'}`}>
                    {data.verified
                      ? 'La signature numérique et l\'intégrité du fichier sont valides.'
                      : data.reason === 'no_signature' ? 'Ce rapport n\'a pas de signature numérique (généré avant la mise à jour).'
                      : 'Le fichier a peut-être été modifié ou la signature est invalide.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Report meta */}
            {data.report && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-widest text-[10px]">Informations du rapport</h3>
                <div className="space-y-1.5">
                  {[
                    ['Titre',       data.report.title],
                    ['Type',        data.report.type],
                    ['Langue',      data.report.language?.toUpperCase()],
                    ['Période',     data.report.period],
                    ['Version',     `v${data.report.version}`],
                    ['Taille',      data.report.fileSize ? (data.report.fileSize / 1024).toFixed(1) + ' KB' : '—'],
                    ['Généré le',   data.report.createdAt ? new Date(data.report.createdAt).toLocaleString('fr-FR') : '—'],
                    ['Signé le',    data.report.signedAt  ? new Date(data.report.signedAt).toLocaleString('fr-FR')  : '—'],
                    ['Signataire',  data.report.generatedByName || data.report.signerCN || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-800 font-medium text-right max-w-[260px] truncate">{v}</span>
                    </div>
                  ))}
                </div>

                {data.report.hash && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SHA-256</div>
                    <div className="text-[10px] font-mono text-slate-600 break-all">{data.report.hash}</div>
                  </div>
                )}
              </div>
            )}

            {/* Verification checks */}
            {data.checks && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contrôles de vérification</h3>
                <CheckRow ok={data.checks.fileFound}      label="Fichier PDF trouvé"          sub="Le fichier original est présent sur le serveur." />
                <CheckRow ok={data.checks.hashIntact}     label="Intégrité du document"       sub="Le SHA-256 actuel correspond au hash signé au moment de la génération." />
                <CheckRow ok={data.checks.signatureValid} label="Signature numérique valide"  sub="La signature RSA-SHA256 correspond au certificat Tac-Tic ERM." />
              </div>
            )}

            {/* Timestamps */}
            <div className="flex flex-col gap-3 mb-4">
              {data.tsa && <TSABadge status={data.tsa.status} issuer={data.tsa.issuer} timestamp={data.tsa.timestamp} />}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 mt-6">
              <p>Ce service de vérification est fourni par <strong>Tac-Tic ERM</strong>.</p>
              <p className="mt-1">Signature RSA-SHA256 + horodatage TSA (RFC 3161, eIDAS).</p>
              <Link to="/login" className="inline-block mt-3 text-blue-500 hover:underline">← Accéder à la plateforme</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
