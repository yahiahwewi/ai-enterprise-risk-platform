import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import KPICard from '../components/KPICard';
import { SkeletonKPIGrid } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

/**
 * Analyst workbench — focused page for the Analyst role.
 * Combines: AI risk score, radar, health index, 5x5 matrix placeholder,
 * qualitative notes and shortcut to the full risk report.
 */
export default function AnalystWorkbench() {
  const [report,  setReport]  = useState(null);
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes,   setNotes]   = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        api.get('/ai/risk-report').catch(() => ({ data: null })),
        api.get('/ai/health-index').catch(() => ({ data: null })),
      ]);
      setReport(r1.data);
      setHealth(r2.data);
    } catch {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, lang]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  const LEVELS_FR = { low: 'Faible', moderate: 'Modéré', high: 'Élevé', critical: 'Critique' };
  const LEVELS_EN = { low: 'Low',    moderate: 'Moderate', high: 'High', critical: 'Critical' };
  const L = lang === 'fr' ? LEVELS_FR : LEVELS_EN;

  const levelColor = (lv) => ({
    low:       'text-green-600 bg-green-100 dark:bg-green-900/30',
    moderate:  'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    high:      'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    critical:  'text-red-600 bg-red-100 dark:bg-red-900/30',
  }[lv] || 'text-slate-500 bg-slate-100');

  const score = report?.globalScore ?? null;
  const level = report?.level ?? null;
  const areas = report?.areas || [];

  if (loading) return (
    <div>
      <section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">
        {lang === 'fr' ? 'Espace analyste' : 'Analyst workbench'}
      </h2></section>
      <SkeletonKPIGrid count={3} />
    </div>
  );

  return (
    <div>
      <section className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
            {lang === 'fr' ? 'Espace analyste' : 'Analyst workbench'}
          </h2>
          <p className="text-on-surface-variant mt-2">
            {lang === 'fr'
              ? 'Analyse des risques, scoring IA, matrice 5×5 et notes qualitatives.'
              : 'Risk analysis, AI scoring, 5×5 matrix and qualitative notes.'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="executive-gradient text-white text-sm font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
            {refreshing ? 'progress_activity' : 'refresh'}
          </span>
          {lang === 'fr' ? 'Relancer le scoring IA' : 'Run AI scoring'}
        </button>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KPICard
          label={lang === 'fr' ? 'Score de risque global' : 'Global risk score'}
          value={score !== null ? `${score}/100` : '—'}
          icon="crisis_alert"
          iconColor={level === 'critical' ? 'red' : level === 'high' ? 'orange' : level === 'moderate' ? 'yellow' : 'green'}
        />
        <KPICard
          label={lang === 'fr' ? 'Indice de santé' : 'Health index'}
          value={health?.score !== undefined ? `${health.score}/100 (${health.grade || '—'})` : '—'}
          icon="monitor_heart"
          iconColor="blue"
        />
        <KPICard
          label={lang === 'fr' ? 'Niveau de risque' : 'Risk level'}
          value={level ? L[level] : '—'}
          icon="speed"
          iconColor="purple"
        />
      </div>

      {/* Areas list + qualitative notes */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
        {/* Areas */}
        <div className="lg:col-span-3 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {lang === 'fr' ? 'Domaines de risque' : 'Risk areas'}
          </h3>
          {areas.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              {lang === 'fr' ? 'Aucun domaine retourné par le service IA.' : 'No area returned by the AI service.'}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {areas.map((a, i) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low dark:bg-slate-700/50">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface dark:text-slate-200">{a.name || a.domain || `Domaine ${i+1}`}</p>
                    {a.description && <p className="text-xs text-on-surface-variant truncate">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColor(a.level)}`}>
                      {a.level ? L[a.level] : '—'}
                    </span>
                    {a.score !== undefined && (
                      <span className="text-sm font-bold font-headline text-on-surface dark:text-slate-200">
                        {a.score}/100
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Qualitative notes (local, not persisted) */}
        <div className="lg:col-span-2 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-2">
            {lang === 'fr' ? 'Notes qualitatives' : 'Qualitative notes'}
          </h3>
          <p className="text-xs text-on-surface-variant mb-3">
            {lang === 'fr'
              ? 'Zone de travail locale pour préparer votre rapport d\'analyse. Non enregistrée côté serveur.'
              : 'Local scratch area for preparing your analysis. Not persisted on the server.'}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="10"
            placeholder={lang === 'fr'
              ? 'Ex. Pourquoi le score baisse-t-il ce mois-ci ? Quels leviers activer ?'
              : 'E.g. Why did the score drop this month? Which levers to activate?'}
            className="w-full rounded-lg bg-surface-container-low dark:bg-slate-700 border-none p-3 text-sm text-on-surface dark:text-slate-200 resize-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-on-surface-variant">{notes.length} {lang === 'fr' ? 'caractères' : 'chars'}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(notes);
                addToast('success', lang === 'fr' ? 'Copié' : 'Copied', '');
              }}
              disabled={!notes}
              className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
            >
              {lang === 'fr' ? 'Copier' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* 5x5 matrix — visual grid */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
          {lang === 'fr' ? 'Matrice de risques 5×5' : '5×5 risk matrix'}
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          {lang === 'fr' ? 'Probabilité (horizontal) × Impact (vertical)' : 'Probability (horizontal) × Impact (vertical)'}
        </p>
        <div className="inline-block">
          <div className="grid grid-cols-6 gap-1 text-[10px] font-bold">
            <div></div>
            {[1,2,3,4,5].map((p) => <div key={`p${p}`} className="text-center text-on-surface-variant py-1">P{p}</div>)}
            {[5,4,3,2,1].map((i) => (
              <>
                <div key={`i${i}`} className="text-right pr-2 text-on-surface-variant py-2">I{i}</div>
                {[1,2,3,4,5].map((p) => {
                  const v = i * p;
                  const cls = v >= 20 ? 'bg-red-500 text-white'
                            : v >= 12 ? 'bg-orange-400 text-white'
                            : v >= 6  ? 'bg-amber-300 text-amber-900'
                            :           'bg-green-300 text-green-900';
                  return (
                    <div key={`c-${i}-${p}`} className={`h-10 w-12 rounded flex items-center justify-center ${cls}`}>
                      {v}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Shortcut */}
      <div className="flex flex-wrap gap-3">
        <Link to="/risk-report" className="bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-surface-container-highest dark:hover:bg-slate-600 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">assessment</span>
          {lang === 'fr' ? 'Rapport de risque détaillé' : 'Full risk report'}
        </Link>
        <Link to="/simulate" className="bg-surface-container-high dark:bg-slate-700 text-on-surface dark:text-slate-200 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-surface-container-highest dark:hover:bg-slate-600 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">science</span>
          {lang === 'fr' ? 'Simuler un scénario' : 'Simulate a scenario'}
        </Link>
      </div>
    </div>
  );
}
