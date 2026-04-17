import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';

const VERIFY_API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // report object to delete
  const [deleting, setDeleting] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [checkResults, setCheckResults] = useState({}); // { [reportId]: { verified, checks, reason, tsa } }
  const [checkDetail, setCheckDetail] = useState(null); // detail modal data
  const { addToast } = useToast();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const isAuditor = user?.role === 'auditor';

  const fetchReports = useCallback(() => {
    api.get('/export/pdf/history?limit=20')
      .then((r) => { setReports(r.data.reports); setTotal(r.data.total); })
      .catch(() => addToast('error', t('toast.error'), t('toast.failed')))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const generateReport = async (type = 'monthly') => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/export/pdf/generate?type=${type}&language=${lang}`);
      addToast('success', lang === 'fr' ? 'Rapport généré' : 'Report generated', data.report.title);
      fetchReports();
    } catch (err) {
      addToast('error', t('toast.error'), err.response?.data?.message || t('toast.failed'));
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (reportId, filename) => {
    api.get(`/export/pdf/${reportId}`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => addToast('error', t('toast.error'), t('toast.failed')));
  };

  const checkReport = async (report) => {
    setCheckingId(report.id);
    try {
      const { data } = await axios.get(`${VERIFY_API}/verify/${report.id}`);
      setCheckResults((prev) => ({ ...prev, [report.id]: data }));
      setCheckDetail({ report, result: data });
    } catch (err) {
      addToast('error', t('toast.error'), err.response?.data?.error || (lang === 'fr' ? 'Vérification impossible' : 'Check failed'));
    } finally {
      setCheckingId(null);
    }
  };

  const deleteReport = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/export/pdf/${confirmDelete.id}`);
      addToast('success', lang === 'fr' ? 'Rapport supprimé' : 'Report deleted', confirmDelete.title);
      setConfirmDelete(null);
      fetchReports();
    } catch (err) {
      addToast('error', t('toast.error'), err.response?.data?.message || t('toast.failed'));
    } finally {
      setDeleting(false);
    }
  };

  const riskBadge = (level) => {
    const styles = {
      low: 'bg-green-100 text-green-700',
      moderate: 'bg-amber-100 text-amber-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return styles[level] || styles.moderate;
  };

  const reportLabels = {
    fr: { title: 'Rapports', subtitle: 'Générer et télécharger les rapports exécutifs', generate: 'Générer un rapport', generating: 'Génération...', monthly: 'Rapport mensuel', decision: 'Rapport décision IA', history: 'Historique des rapports', download: 'Télécharger', type: 'Type', period: 'Période', version: 'Version', score: 'Score', size: 'Taille', status: 'Statut', date: 'Date', noReports: 'Aucun rapport', noReportsMsg: 'Générez votre premier rapport ci-dessus.' },
    en: { title: 'Reports', subtitle: 'Generate and download executive reports', generate: 'Generate Report', generating: 'Generating...', monthly: 'Monthly Report', decision: 'AI Decision Report', history: 'Report History', download: 'Download', type: 'Type', period: 'Period', version: 'Version', score: 'Score', size: 'Size', status: 'Status', date: 'Date', noReports: 'No reports yet', noReportsMsg: 'Generate your first report above.' },
  };
  const rl = reportLabels[lang] || reportLabels.fr;

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{rl.title}</h2></section><SkeletonTable rows={5} cols={5} /></div>);

  return (
    <div>
      <ReadOnlyBanner />
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{rl.title}</h2>
        <p className="text-on-surface-variant mt-2">{rl.subtitle}</p>
      </section>

      {/* Generate panel — hidden for auditors */}
      {!isAuditor && (
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        {/* Buttons row */}
        <div className="flex flex-wrap gap-3 items-center mb-5">
          <button
            onClick={() => generateReport('monthly')}
            disabled={generating}
            className="executive-gradient text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {generating ? rl.generating : rl.monthly}
          </button>
          <button
            onClick={() => generateReport('decision')}
            disabled={generating}
            className="bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-surface-container-highest dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            {rl.decision}
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-surface-container-high dark:bg-slate-700 mx-1 hidden md:block" />

          {/* Verify button — opens the upload-and-check page */}
          <Link
            to="/verify-upload"
            target="_blank"
            className="group relative overflow-hidden text-sm font-bold px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #0ea5a0 0%, #0f4c81 100%)',
            }}
          >
            {/* Shine sweep */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out"
              style={{
                background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)',
              }}
            />
            <span className="relative flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              {lang === 'fr' ? 'Vérifier un rapport' : 'Verify a report'}
              <span className="ml-0.5 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[10px]">upload_file</span>
                PDF
              </span>
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-surface-container-high dark:border-slate-700 mb-4" />

        {/* Certification options */}
        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
          {lang === 'fr' ? 'Options de certification' : 'Certification options'}
        </p>
        <div className="flex flex-col gap-2.5">

          {/* TSA — always on */}
          <div className="flex items-start gap-3 px-3.5 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="w-4 h-4 mt-0.5 rounded flex items-center justify-center bg-blue-600 flex-shrink-0">
              <span className="material-symbols-outlined text-white text-[12px]">check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-blue-600">verified_user</span>
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {lang === 'fr' ? 'Horodatage TSA (RFC 3161)' : 'TSA Timestamp (RFC 3161)'}
                </span>
                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                  {lang === 'fr' ? 'Toujours actif' : 'Always on'}
                </span>
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                {lang === 'fr'
                  ? 'Signature instantanée par DigiCert / Sectigo. Standard eIDAS, légalement reconnu en UE.'
                  : 'Instant signature by DigiCert / Sectigo. eIDAS standard, legally recognised in the EU.'}
              </p>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* Report history */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{rl.history} ({total})</h3>
        {reports.length === 0 ? (
          <EmptyState icon="picture_as_pdf" title={rl.noReports} message={rl.noReportsMsg} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{rl.title}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{rl.type}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{rl.score}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{rl.size}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{rl.date}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{lang === 'fr' ? 'Signature' : 'Signature'}</th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3">
                      <div className="text-sm font-medium text-on-surface dark:text-slate-200">{r.title}</div>
                      <div className="text-[10px] text-on-surface-variant">
                        v{r.version} · {r.language.toUpperCase()}
                        {r.generatedByName && <> · <span className="font-semibold">{r.generatedByName}</span></>}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{r.type}</span>
                    </td>
                    <td className="py-3">
                      {r.data?.globalScore !== undefined && (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${riskBadge(r.data.level)}`}>
                          {r.data.globalScore}/100
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-on-surface-variant">{formatSize(r.fileSize)}</td>
                    <td className="py-3 text-sm text-on-surface-variant whitespace-nowrap">
                      <div className="text-sm text-on-surface dark:text-slate-200">
                        {new Date(r.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[11px]">schedule</span>
                        {new Date(r.createdAt).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    {/* Signature & timestamps */}
                    <td className="py-3">
                      {r.hash ? (
                        <div className="flex flex-col gap-1">
                          {/* Inline check result chip */}
                          {(() => {
                            const cr = checkResults[r.id];
                            if (!cr) {
                              return (
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px] text-green-600">verified</span>
                                  <span className="text-[10px] text-green-700 font-bold">RSA signé</span>
                                </div>
                              );
                            }
                            if (cr.verified) {
                              return (
                                <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                  <span className="material-symbols-outlined text-[12px]">verified</span>
                                  {lang === 'fr' ? 'Authentique' : 'Authentic'}
                                </div>
                              );
                            }
                            if (cr.reason === 'no_signature') {
                              return (
                                <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  <span className="material-symbols-outlined text-[12px]">remove_moderator</span>
                                  {lang === 'fr' ? 'Non signé' : 'Unsigned'}
                                </div>
                              );
                            }
                            if (cr.checks && cr.checks.hashIntact === false) {
                              return (
                                <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                  <span className="material-symbols-outlined text-[12px]">edit_note</span>
                                  {lang === 'fr' ? 'Modifié' : 'Edited'}
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                <span className="material-symbols-outlined text-[12px]">gpp_bad</span>
                                {lang === 'fr' ? 'Échec' : 'Failed'}
                              </div>
                            );
                          })()}

                          {/* TSA */}
                          {r.tsaStatus === 'ok' && (
                            <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit bg-blue-100 text-blue-700">
                              <span className="material-symbols-outlined text-[11px]">verified_user</span>
                              TSA ✓
                            </div>
                          )}

                          {/* Inline check button */}
                          <button
                            onClick={() => checkReport(r)}
                            disabled={checkingId === r.id}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 disabled:opacity-50"
                          >
                            {checkingId === r.id ? (
                              <span className="material-symbols-outlined text-[11px] animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-[11px]">fact_check</span>
                            )}
                            {lang === 'fr' ? 'Vérifier' : 'Check'}
                          </button>

                        </div>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {r.status === 'ready' ? (
                          <button
                            onClick={() => downloadReport(r.id, r.title + '.pdf')}
                            className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            {rl.download}
                          </button>
                        ) : (
                          <span className="text-xs text-on-surface-variant">{r.status === 'generating' ? '...' : 'Failed'}</span>
                        )}
                        {!isAuditor && (
                          <button
                            onClick={() => setConfirmDelete(r)}
                            title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check result detail modal */}
      {checkDetail && (() => {
        const { report, result } = checkDetail;
        const verified = result.verified;
        const edited = result.checks && result.checks.hashIntact === false;
        const unsigned = result.reason === 'no_signature';

        const headerClr = verified ? 'bg-green-50 dark:bg-green-900/20'
          : edited ? 'bg-orange-50 dark:bg-orange-900/20'
          : unsigned ? 'bg-slate-100 dark:bg-slate-700/40'
          : 'bg-red-50 dark:bg-red-900/20';
        const headerIcon = verified ? 'verified' : edited ? 'edit_note' : unsigned ? 'remove_moderator' : 'gpp_bad';
        const headerIconClr = verified ? 'text-green-600' : edited ? 'text-orange-500' : unsigned ? 'text-slate-400' : 'text-red-500';
        const headerTitle = verified ? (lang === 'fr' ? 'Rapport authentique' : 'Authentic report')
          : edited ? (lang === 'fr' ? 'Rapport modifié' : 'Report edited')
          : unsigned ? (lang === 'fr' ? 'Rapport non signé' : 'Unsigned report')
          : (lang === 'fr' ? 'Vérification échouée' : 'Verification failed');

        const row = (ok, label) => (
          <div className="flex items-start gap-2 py-1.5">
            <span className={`material-symbols-outlined text-[16px] mt-0.5 ${ok ? 'text-green-600' : 'text-red-500'}`}>
              {ok ? 'check_circle' : 'cancel'}
            </span>
            <span className="text-sm text-on-surface dark:text-slate-200">{label}</span>
          </div>
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCheckDetail(null)}>
            <div
              className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto goals-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`rounded-t-2xl px-6 py-5 flex items-center gap-3 ${headerClr}`}>
                <span className={`material-symbols-outlined text-[32px] ${headerIconClr}`}>{headerIcon}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold font-headline text-on-surface dark:text-slate-100">{headerTitle}</h3>
                  <p className="text-xs text-on-surface-variant truncate">{report.title}</p>
                </div>
                <button onClick={() => setCheckDetail(null)} className="ml-auto p-1.5 rounded-lg hover:bg-black/10 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {unsigned ? (
                  <p className="text-sm text-on-surface-variant">
                    {lang === 'fr'
                      ? 'Ce rapport a été généré avant l\'activation de la signature numérique. Aucune empreinte n\'est disponible.'
                      : 'This report was generated before digital signing was enabled. No fingerprint available.'}
                  </p>
                ) : result.checks ? (
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                      {lang === 'fr' ? 'Contrôles' : 'Checks'}
                    </p>
                    {row(result.checks.fileFound, lang === 'fr' ? 'Fichier PDF présent sur le serveur' : 'PDF file present on server')}
                    {row(result.checks.hashIntact, lang === 'fr' ? 'Intégrité SHA-256 (document non modifié)' : 'SHA-256 integrity (document unmodified)')}
                    {row(result.checks.signatureValid, lang === 'fr' ? 'Signature RSA-SHA256 valide' : 'RSA-SHA256 signature valid')}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">{result.error || (lang === 'fr' ? 'Vérification impossible' : 'Check unavailable')}</p>
                )}

                {result.tsa && result.tsa.status === 'ok' && (
                  <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-blue-600">verified_user</span>
                    <div>
                      <div className="text-xs font-bold text-blue-800 dark:text-blue-200">
                        {lang === 'fr' ? 'Horodatage certifié' : 'Certified timestamp'} — {result.tsa.issuer}
                      </div>
                      <div className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                        RFC 3161 · eIDAS · {result.tsa.timestamp ? new Date(result.tsa.timestamp).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB') : ''}
                      </div>
                    </div>
                  </div>
                )}

                {edited && (
                  <div className="rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-1">
                      {lang === 'fr' ? 'Le fichier a été modifié' : 'The file has been edited'}
                    </p>
                    <p className="text-[11px] text-orange-600 dark:text-orange-400">
                      {lang === 'fr'
                        ? 'Le SHA-256 actuel du PDF ne correspond plus au hash signé au moment de la génération. Régénérez le rapport pour obtenir une version certifiée.'
                        : 'The PDF\'s current SHA-256 no longer matches the hash signed at generation time. Regenerate the report for a fresh certified version.'}
                    </p>
                  </div>
                )}

                {result.report?.generatedByName && (
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-on-surface-variant">{lang === 'fr' ? 'Généré par' : 'Generated by'}</span>
                    <span className="text-on-surface dark:text-slate-200 font-semibold">{result.report.generatedByName}</span>
                  </div>
                )}

                {result.report?.hash && (
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">SHA-256</p>
                    <p className="text-[10px] font-mono text-on-surface-variant break-all">{result.report.hash}</p>
                  </div>
                )}
              </div>

              <div className="px-6 pb-5">
                <button
                  onClick={() => setCheckDetail(null)}
                  className="w-full py-2.5 rounded-lg text-sm font-bold bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 hover:bg-surface-container-highest dark:hover:bg-slate-600 transition-colors"
                >
                  {lang === 'fr' ? 'Fermer' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 goals-pop">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500 text-[26px]">delete_forever</span>
            </div>
            {/* Title */}
            <h3 className="text-base font-extrabold font-headline text-on-surface dark:text-slate-100 text-center">
              {lang === 'fr' ? 'Supprimer ce rapport ?' : 'Delete this report?'}
            </h3>
            {/* Report name */}
            <p className="text-sm text-on-surface-variant text-center mt-2 mb-1 line-clamp-2">
              {confirmDelete.title}
            </p>
            <p className="text-xs text-on-surface-variant text-center mb-6">
              {lang === 'fr'
                ? 'Le fichier PDF et toutes les données de certification seront supprimés définitivement.'
                : 'The PDF file and all certification data will be permanently deleted.'}
            </p>
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 hover:bg-surface-container-highest dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={deleteReport}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                )}
                {deleting
                  ? (lang === 'fr' ? 'Suppression...' : 'Deleting...')
                  : (lang === 'fr' ? 'Supprimer' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
