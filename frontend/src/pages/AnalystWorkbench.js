import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import KPICard from '../components/KPICard';
import { SkeletonKPIGrid } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';
import { draftMemo } from '../services/memoDrafter';

/**
 * Analyst workbench — focused page for the Analyst role.
 * Combines: AI risk score, radar, health index, 5x5 matrix placeholder,
 * qualitative notes and shortcut to the full risk report.
 */
const MEMO_INIT = { contexte: '', observations: '', causes: '', recommandations: '' };

export default function AnalystWorkbench() {
  const [report,  setReport]  = useState(null);
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Structured risk memo state
  const [memoSections, setMemoSections] = useState(MEMO_INIT);
  const [memoSeverity, setMemoSeverity] = useState('info');
  const [memoSaving,   setMemoSaving]   = useState(false);
  const [memoHistory,  setMemoHistory]  = useState([]);
  const [expandedMemoId, setExpandedMemoId] = useState(null);
  const [showEscalateConfirm, setShowEscalateConfirm] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get('/ai/risk-report').catch(() => ({ data: null })),
        api.get('/ai/health-index').catch(() => ({ data: null })),
        api.get('/risk-memos').catch(() => ({ data: [] })),
      ]);
      setReport(r1.data);
      setHealth(r2.data);
      setMemoHistory(r3.data || []);
    } catch {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, lang]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  const attemptSaveMemo = () => {
    const hasContent = Object.values(memoSections).some((v) => (v || '').trim().length > 0);
    if (!hasContent) {
      addToast('error', lang === 'fr' ? 'Mémo vide' : 'Empty memo',
        lang === 'fr' ? 'Remplissez au moins une section.' : 'Fill at least one section.');
      return;
    }
    // Critical severity requires an explicit confirmation because it escalates
    // to the Owner and appears as a red banner on every page of their app.
    if (memoSeverity === 'critical') {
      setShowEscalateConfirm(true);
      return;
    }
    performSave();
  };

  const performSave = async () => {
    setShowEscalateConfirm(false);
    setMemoSaving(true);
    try {
      const { data } = await api.post('/risk-memos', {
        severity:      memoSeverity,
        sections:      memoSections,
        snapshotScore: report?.globalScore,
        snapshotLevel: report?.level,
      });
      const newMemo = data.memo || data; // backend now returns { memo, alertSent }
      setMemoHistory((prev) => [newMemo, ...prev]);
      setMemoSections(MEMO_INIT);
      setMemoSeverity('info');
      if (data.alertSent) {
        addToast('success',
          lang === 'fr' ? 'Alerte envoyée au dirigeant' : 'Alert sent to owner',
          lang === 'fr' ? 'Le mémo a été escaladé en tant qu\'alerte critique.' : 'Memo escalated as a critical alert.');
      } else {
        addToast('success', lang === 'fr' ? 'Mémo enregistré' : 'Memo saved', '');
      }
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setMemoSaving(false);
    }
  };

  const generateDraft = () => {
    if (!report) {
      addToast('error',
        lang === 'fr' ? 'Données IA indisponibles' : 'AI data unavailable',
        lang === 'fr' ? 'Relancez le scoring IA avant de générer un brouillon.' : 'Run AI scoring before generating a draft.');
      return;
    }
    // Warn the analyst if existing content would be overwritten
    const hasExisting = Object.values(memoSections).some((v) => (v || '').trim().length > 0);
    if (hasExisting) {
      const ok = window.confirm(lang === 'fr'
        ? 'Le brouillon IA va remplacer le contenu existant. Continuer ?'
        : 'The AI draft will replace the existing content. Continue?');
      if (!ok) return;
    }
    setDrafting(true);
    // Small delay so the user perceives the action as a "generation"
    setTimeout(() => {
      try {
        const { severity, sections } = draftMemo(report, health, lang);
        setMemoSections(sections);
        setMemoSeverity(severity);
        addToast('success',
          lang === 'fr' ? 'Brouillon généré' : 'Draft generated',
          lang === 'fr' ? 'Les 4 sections ont été pré-remplies.' : 'All four sections have been pre-filled.');
      } catch (e) {
        addToast('error', lang === 'fr' ? 'Erreur' : 'Error', e.message);
      } finally {
        setDrafting(false);
      }
    }, 350);
  };

  const deleteMemo = async (id) => {
    try {
      await api.delete(`/risk-memos/${id}`);
      setMemoHistory((prev) => prev.filter((m) => m._id !== id));
      addToast('success', lang === 'fr' ? 'Mémo supprimé' : 'Memo deleted', '');
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    }
  };

  // Severity presets
  const SEVERITIES = [
    { key: 'info',     fr: 'Information',    en: 'Info',        icon: 'info',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'watch',    fr: 'Surveillance',   en: 'Watch',       icon: 'visibility',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'alert',    fr: 'Alerte',         en: 'Alert',       icon: 'warning',       cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'critical', fr: 'Critique',       en: 'Critical',    icon: 'crisis_alert',  cls: 'bg-red-50 text-red-700 border-red-200' },
  ];
  const severityOf = (k) => SEVERITIES.find((s) => s.key === k) || SEVERITIES[0];

  // Section templates (placeholders to guide the analyst)
  const SECTION_DEF = [
    {
      key: 'contexte',
      fr: 'Contexte',                en: 'Context',
      icon: 'flag',
      hint_fr: 'Période analysée, évènements marquants, périmètre de l\'analyse.',
      hint_en: 'Period under review, key events, scope.',
    },
    {
      key: 'observations',
      fr: 'Observations',            en: 'Observations',
      icon: 'search',
      hint_fr: 'Constats chiffrés, évolutions du score, écarts par rapport aux seuils.',
      hint_en: 'Metrics, score evolution, threshold deviations.',
    },
    {
      key: 'causes',
      fr: 'Causes probables',        en: 'Probable causes',
      icon: 'psychology',
      hint_fr: 'Facteurs internes/externes, dépendances, hypothèses à vérifier.',
      hint_en: 'Internal/external factors, dependencies, hypotheses.',
    },
    {
      key: 'recommandations',
      fr: 'Recommandations',         en: 'Recommendations',
      icon: 'lightbulb',
      hint_fr: 'Actions correctives priorisées et propriétaires.',
      hint_en: 'Prioritised corrective actions and owners.',
    },
  ];

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

  // Map the AI service's `breakdown` object { cashFlow: {score, weight}, ... }
  // into a uniform list of areas. The lower the sub-score, the higher the risk,
  // so we derive a qualitative level from the score to colour the badge.
  const DOMAIN_LABELS = {
    cashFlow:   { fr: 'Trésorerie',         en: 'Cash flow',    icon: 'water_drop'   },
    invoices:   { fr: 'Factures',           en: 'Invoices',     icon: 'description'  },
    debt:       { fr: 'Endettement',        en: 'Debt',         icon: 'account_balance_wallet' },
    loanBurden: { fr: 'Charge d\'emprunt',  en: 'Loan burden',  icon: 'account_balance' },
  };
  // Higher score = more risk (aligned with the global risk score convention:
  //  0-24 OK, 25-49 Monitor, 50-74 Action Required, 75-100 Immediate Action)
  const scoreToLevel = (s) => {
    if (s === null || s === undefined) return null;
    if (s >= 75) return 'critical';
    if (s >= 50) return 'high';
    if (s >= 25) return 'moderate';
    return 'low';
  };
  const areas = report?.breakdown
    ? Object.entries(report.breakdown).map(([key, v]) => ({
        key,
        name:   DOMAIN_LABELS[key]?.[lang === 'fr' ? 'fr' : 'en'] || key,
        icon:   DOMAIN_LABELS[key]?.icon || 'category',
        score:  v.score,
        weight: v.weight,
        level:  scoreToLevel(v.score),
      }))
    : [];

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
              {areas.map((a) => (
                <li key={a.key} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low dark:bg-slate-700/50">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high dark:bg-slate-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{a.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{a.name}</p>
                    {a.weight && (
                      <p className="text-[10px] text-on-surface-variant">
                        {lang === 'fr' ? 'Pondération' : 'Weight'} : {a.weight}
                      </p>
                    )}
                  </div>
                  {/* Mini gauge */}
                  <div className="hidden md:block w-24 h-1.5 rounded-full bg-surface-container-high dark:bg-slate-600 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        a.level === 'low' ? 'bg-green-500' :
                        a.level === 'moderate' ? 'bg-amber-500' :
                        a.level === 'high' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, a.score))}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelColor(a.level)}`}>
                      {a.level ? L[a.level] : '—'}
                    </span>
                    <span className="text-sm font-bold font-headline text-on-surface dark:text-slate-200 w-12 text-right">
                      {a.score}/100
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Structured risk memo — persisted, auditable */}
        <div className="lg:col-span-2 bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100">
                {lang === 'fr' ? 'Mémo d\'analyse' : 'Analysis memo'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {lang === 'fr'
                  ? 'Mémo structuré, horodaté et attribué. Visible par l\'Owner et l\'Auditeur.'
                  : 'Structured, timestamped and attributed. Visible to Owner and Auditor.'}
              </p>
            </div>
            {report?.globalScore !== undefined && (
              <div className="shrink-0 text-right">
                <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                  {lang === 'fr' ? 'Snapshot IA' : 'AI snapshot'}
                </div>
                <div className="text-sm font-bold text-on-surface dark:text-slate-200">{report.globalScore}/100</div>
              </div>
            )}
          </div>

          {/* AI draft button — fills the 4 sections using live score/level/breakdown */}
          <button
            onClick={generateDraft}
            disabled={drafting || !report}
            title={lang === 'fr' ? 'Générer un brouillon basé sur l\'état actuel du scoring' : 'Generate a draft based on the current scoring state'}
            className="group relative w-full overflow-hidden rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 text-white text-xs font-extrabold transition-all disabled:opacity-60 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#2563eb 50%,#0ea5a0 100%)' }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out"
              style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)' }}
            />
            <span className={`material-symbols-outlined text-[18px] relative ${drafting ? 'animate-spin' : ''}`}>
              {drafting ? 'progress_activity' : 'auto_awesome'}
            </span>
            <span className="relative">
              {drafting
                ? (lang === 'fr' ? 'Génération en cours…' : 'Generating…')
                : (lang === 'fr' ? 'Rédiger avec l\'IA' : 'Draft with AI')}
            </span>
            <span className="relative text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
              {lang === 'fr' ? 'Basé sur le score' : 'Score-aware'}
            </span>
          </button>

          {/* Severity picker */}
          <div className="mt-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {lang === 'fr' ? 'Gravité' : 'Severity'}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {SEVERITIES.map((s) => {
                const active = memoSeverity === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setMemoSeverity(s.key)}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all text-[10px] font-bold ${
                      active
                        ? `${s.cls} ring-2 ring-offset-1 ring-offset-surface-container-lowest`
                        : 'border-transparent bg-surface-container-low dark:bg-slate-700/50 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                    {lang === 'fr' ? s.fr : s.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Four structured sections */}
          <div className="mt-4 space-y-3">
            {SECTION_DEF.map((def) => (
              <div key={def.key}>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  <span className="material-symbols-outlined text-[14px]">{def.icon}</span>
                  {lang === 'fr' ? def.fr : def.en}
                </label>
                <textarea
                  rows="2"
                  value={memoSections[def.key]}
                  onChange={(e) => setMemoSections((prev) => ({ ...prev, [def.key]: e.target.value }))}
                  placeholder={lang === 'fr' ? def.hint_fr : def.hint_en}
                  className="w-full rounded-lg bg-surface-container-low dark:bg-slate-700 border-none p-2.5 text-sm text-on-surface dark:text-slate-200 resize-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-container-high dark:border-slate-700">
            <span className="text-[10px] text-on-surface-variant">
              {Object.values(memoSections).reduce((n, s) => n + (s || '').length, 0)} {lang === 'fr' ? 'caractères' : 'chars'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMemoSections(MEMO_INIT); setMemoSeverity('info'); }}
                disabled={memoSaving}
                className="text-xs font-bold text-on-surface-variant hover:text-on-surface px-3 py-1.5 disabled:opacity-50"
              >
                {lang === 'fr' ? 'Réinitialiser' : 'Reset'}
              </button>
              <button
                onClick={attemptSaveMemo}
                disabled={memoSaving}
                className={`text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5 disabled:opacity-60 ${
                  memoSeverity === 'critical'
                    ? 'bg-red-600 hover:bg-red-700 shadow-sm shadow-red-400/40'
                    : 'executive-gradient'
                }`}
              >
                {memoSaving
                  ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[14px]">{memoSeverity === 'critical' ? 'crisis_alert' : 'save'}</span>}
                {memoSeverity === 'critical'
                  ? (lang === 'fr' ? 'Envoyer l\'alerte' : 'Send alert')
                  : (lang === 'fr' ? 'Enregistrer' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Memo history */}
      {memoHistory.length > 0 && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-8">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {lang === 'fr' ? 'Historique des mémos' : 'Memo history'} ({memoHistory.length})
          </h3>
          <ul className="space-y-2">
            {memoHistory.slice(0, 5).map((m) => {
              const sev = severityOf(m.severity);
              const isOpen = expandedMemoId === m._id;
              return (
                <li key={m._id} className="rounded-lg border border-surface-container-high dark:border-slate-700 overflow-hidden">
                  <button
                    onClick={() => setExpandedMemoId(isOpen ? null : m._id)}
                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.cls}`}>
                        <span className="material-symbols-outlined text-[12px]">{sev.icon}</span>
                        {lang === 'fr' ? sev.fr : sev.en}
                      </span>
                      <span className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{m.authorName}</span>
                      <span className="text-[11px] text-on-surface-variant hidden md:inline">
                        · {new Date(m.createdAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB')}
                      </span>
                      {m.snapshotScore !== undefined && (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                          {lang === 'fr' ? 'Score' : 'Score'} {m.snapshotScore}/100
                        </span>
                      )}
                      {m.escalated && m.acknowledged && (
                        <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">check_circle</span>
                          {lang === 'fr' ? `Acquittée${m.acknowledgedByName ? ' · ' + m.acknowledgedByName : ''}` : `Acknowledged${m.acknowledgedByName ? ' · ' + m.acknowledgedByName : ''}`}
                        </span>
                      )}
                      {m.escalated && !m.acknowledged && (
                        <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                          <span className="material-symbols-outlined text-[11px]">crisis_alert</span>
                          {lang === 'fr' ? 'En attente' : 'Pending'}
                        </span>
                      )}
                    </div>
                    <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-surface-container-high dark:border-slate-700 space-y-3 pt-3">
                      {SECTION_DEF.map((def) => {
                        const val = m.sections?.[def.key];
                        if (!val) return null;
                        return (
                          <div key={def.key}>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">{def.icon}</span>
                              {lang === 'fr' ? def.fr : def.en}
                            </p>
                            <p className="text-sm text-on-surface dark:text-slate-200 whitespace-pre-wrap">{val}</p>
                          </div>
                        );
                      })}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => deleteMemo(m._id)}
                          className="text-[11px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          {lang === 'fr' ? 'Supprimer' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

      {/* Escalation confirm modal */}
      {showEscalateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEscalateConfirm(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md goals-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#ef4444,#991b1b)' }}>
              <div className="flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-[32px]">crisis_alert</span>
                <div>
                  <h3 className="text-base font-extrabold">
                    {lang === 'fr' ? 'Envoyer une alerte critique ?' : 'Send a critical alert?'}
                  </h3>
                  <p className="text-[12px] text-red-100 opacity-90">
                    {lang === 'fr' ? 'Action visible immédiatement par le dirigeant' : 'Immediately visible to the Owner'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-on-surface dark:text-slate-200">
                {lang === 'fr'
                  ? 'Cette alerte s\'affichera comme un bandeau rouge sur toutes les pages du dirigeant (Owner) et dans ses notifications prioritaires, jusqu\'à acquittement.'
                  : 'This alert will appear as a red banner on all Owner pages and in priority notifications, until acknowledged.'}
              </p>
              <p className="text-sm text-on-surface-variant">
                {lang === 'fr'
                  ? 'N\'utilisez cette gravité que pour les situations nécessitant une intervention urgente.'
                  : 'Use this severity only for situations requiring urgent action.'}
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setShowEscalateConfirm(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={performSave}
                className="flex-1 py-2.5 rounded-lg text-sm font-extrabold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5 shadow"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                {lang === 'fr' ? 'Envoyer l\'alerte' : 'Send alert'}
              </button>
            </div>
          </div>
        </div>
      )}

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
