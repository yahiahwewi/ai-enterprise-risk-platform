import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

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
  const { addToast } = useToast();
  const { t, lang } = useLang();

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
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{rl.title}</h2>
        <p className="text-on-surface-variant mt-2">{rl.subtitle}</p>
      </section>

      {/* Generate buttons */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10 flex flex-wrap gap-3 items-center">
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
      </div>

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
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3">
                      <div className="text-sm font-medium text-on-surface dark:text-slate-200">{r.title}</div>
                      <div className="text-[10px] text-on-surface-variant">v{r.version} · {r.language.toUpperCase()}</div>
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
                    <td className="py-3">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
