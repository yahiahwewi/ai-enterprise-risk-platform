import { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

// ─── helpers ────────────────────────────────────────────────
const fmtTND = n =>
  (n < 0 ? '−' : n > 0 ? '+' : '') +
  Math.abs(Math.round(n)).toLocaleString('fr-FR') + ' TND';

const fmtAbs = n => Math.round(n).toLocaleString('fr-FR') + ' TND';

// ─── Impact config ──────────────────────────────────────────
const IMPACT_CFG = {
  very_positive: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: 'trending_up',      labelFr: 'Très positif',   labelEn: 'Very Positive'  },
  positive:      { bg: 'bg-green-100  dark:bg-green-900/30',    text: 'text-green-700  dark:text-green-300',   icon: 'arrow_upward',      labelFr: 'Positif',        labelEn: 'Positive'       },
  neutral:       { bg: 'bg-slate-100  dark:bg-slate-700/40',    text: 'text-slate-600  dark:text-slate-300',   icon: 'remove',            labelFr: 'Neutre',         labelEn: 'Neutral'        },
  medium:        { bg: 'bg-amber-100  dark:bg-amber-900/30',    text: 'text-amber-700  dark:text-amber-300',   icon: 'warning',           labelFr: 'Modéré',         labelEn: 'Moderate'       },
  high:          { bg: 'bg-orange-100 dark:bg-orange-900/30',   text: 'text-orange-700 dark:text-orange-300',  icon: 'priority_high',     labelFr: 'Élevé',          labelEn: 'High'           },
  critical:      { bg: 'bg-red-100    dark:bg-red-900/30',      text: 'text-red-700    dark:text-red-300',     icon: 'emergency',         labelFr: 'Critique',       labelEn: 'Critical'       },
};

// ─── Preset scenarios ────────────────────────────────────────
const PRESETS = [
  {
    id: 'recession',
    iconFr: 'Récession économique', iconEn: 'Economic Recession',
    icon: 'trending_down', color: 'text-red-600',
    params: { incomeChange: -30, expenseChange: 10, lateInvoiceCount: 5, collectionImprovement: -20, rateIncrease: 3, newLoanAmount: 0, assetChange: -15 },
  },
  {
    id: 'growth',
    iconFr: 'Croissance rapide', iconEn: 'Strong Growth',
    icon: 'rocket_launch', color: 'text-emerald-600',
    params: { incomeChange: 40, expenseChange: 15, lateInvoiceCount: 0, collectionImprovement: 20, rateIncrease: 0, newLoanAmount: 0, assetChange: 30 },
  },
  {
    id: 'debt_crisis',
    iconFr: 'Crise d\'endettement', iconEn: 'Debt Crisis',
    icon: 'account_balance', color: 'text-orange-600',
    params: { incomeChange: -10, expenseChange: 20, lateInvoiceCount: 3, collectionImprovement: -10, rateIncrease: 5, newLoanAmount: 150000, assetChange: 0 },
  },
  {
    id: 'collection',
    iconFr: 'Effort de recouvrement', iconEn: 'Collection Drive',
    icon: 'payments', color: 'text-blue-600',
    params: { incomeChange: 0, expenseChange: -5, lateInvoiceCount: 0, collectionImprovement: 40, rateIncrease: 0, newLoanAmount: 0, assetChange: 0 },
  },
  {
    id: 'austerity',
    iconFr: 'Plan d\'austérité', iconEn: 'Austerity Plan',
    icon: 'savings', color: 'text-purple-600',
    params: { incomeChange: -5, expenseChange: -30, lateInvoiceCount: 0, collectionImprovement: 10, rateIncrease: 0, newLoanAmount: 0, assetChange: -10 },
  },
  {
    id: 'expansion',
    iconFr: 'Expansion financée', iconEn: 'Debt-Financed Growth',
    icon: 'construction', color: 'text-indigo-600',
    params: { incomeChange: 25, expenseChange: 30, lateInvoiceCount: 0, collectionImprovement: 0, rateIncrease: 2, newLoanAmount: 200000, assetChange: 50 },
  },
];

// ─── Slider component ────────────────────────────────────────
function Slider({ label, hint, min, max, step = 1, value, onChange, format }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{label}</label>
        <span className="text-sm font-bold font-headline text-on-surface dark:text-slate-100">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 cursor-pointer"
      />
      <div className="flex justify-between text-[9px] text-on-surface-variant dark:text-slate-500 mt-0.5">
        <span>{format(min)}</span>
        {hint && <span className="italic">{hint}</span>}
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Dimension breakdown row ─────────────────────────────────
function DimRow({ label, base, sim, delta }) {
  const isWorse = delta > 0;
  const isBetter = delta < 0;
  return (
    <tr className="border-b border-outline-variant/20 dark:border-slate-700 last:border-0">
      <td className="py-2.5 pr-4 text-sm text-on-surface dark:text-slate-200 font-medium">{label}</td>
      <td className="py-2.5 px-3 text-center">
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{base}</span>
        <span className="text-[10px] text-on-surface-variant dark:text-slate-500">/100</span>
      </td>
      <td className="py-2.5 px-3 text-center">
        <span className={`text-sm font-bold ${isWorse ? 'text-red-600 dark:text-red-400' : isBetter ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-slate-200'}`}>{sim}</span>
        <span className="text-[10px] text-on-surface-variant dark:text-slate-500">/100</span>
      </td>
      <td className="py-2.5 pl-3 text-center">
        <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${isWorse ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : isBetter ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          <span className="material-symbols-outlined text-[11px]">
            {isWorse ? 'arrow_upward' : isBetter ? 'arrow_downward' : 'remove'}
          </span>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      </td>
    </tr>
  );
}

// ─── Custom bar chart tooltip ────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-600 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-on-surface dark:text-slate-100 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────
const DEFAULT_PARAMS = {
  incomeChange: 0, expenseChange: 0, lateInvoiceCount: 0,
  collectionImprovement: 0, rateIncrease: 0, newLoanAmount: 0, assetChange: 0,
};

export default function Simulate() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const { addToast } = useToast();
  const { lang } = useLang();

  const isFr = lang === 'fr';

  const l = isFr ? {
    title: 'Simulation de Scénarios',
    subtitle: 'Simulez l\'impact de 7 leviers financiers sur votre profil de risque',
    section1: 'Revenus & Coûts',
    section2: 'Factures & Recouvrement',
    section3: 'Dettes & Actifs',
    presets: 'Scénarios prédéfinis',
    reset: 'Réinitialiser',
    run: 'Lancer la simulation',
    running: 'Calcul en cours...',
    baselineTitle: 'Situation actuelle',
    simTitle: 'Situation simulée',
    breakdown: 'Décomposition par dimension',
    dimScore: 'Score global',
    dimCashFlow: 'Flux de trésorerie',
    dimInvoices: 'Factures',
    dimDebt: 'Endettement',
    dimLoan: 'Charge prêts',
    colCurrent: 'Actuel',
    colSimulated: 'Simulé',
    colDelta: 'Variation',
    narrative: 'Analyse narrative',
    deltaTitle: 'Variations clés',
    scoreLabel: 'Score de risque',
    cashLabel: 'Flux de trésorerie',
    paymentsLabel: 'Mensualités',
    debtLabel: 'Endettement total',
    assetsLabel: 'Actifs totaux',
    income: 'Revenus', expenses: 'Dépenses',
    incomeHint: 'Variation annuelle', expenseHint: 'Variation annuelle',
    lateHint: 'Factures pending → en retard',
    collectionHint: '+: recouvrement, −: dégradation',
    rateHint: 'Impact sur emprunts existants',
    loanHint: 'Nouveau crédit (durée 5 ans)',
    assetHint: 'Acquisition/cession d\'actifs',
    chartTitle: 'Comparaison des dimensions',
    impactLabel: 'Impact simulé',
  } : {
    title: 'Scenario Simulation',
    subtitle: 'Simulate the impact of 7 financial levers on your risk profile',
    section1: 'Revenue & Costs',
    section2: 'Invoices & Collections',
    section3: 'Debt & Assets',
    presets: 'Quick Presets',
    reset: 'Reset',
    run: 'Run Simulation',
    running: 'Calculating...',
    baselineTitle: 'Current Situation',
    simTitle: 'Simulated Situation',
    breakdown: 'Dimension Breakdown',
    dimScore: 'Global Score',
    dimCashFlow: 'Cash Flow',
    dimInvoices: 'Invoices',
    dimDebt: 'Debt',
    dimLoan: 'Loan Burden',
    colCurrent: 'Current',
    colSimulated: 'Simulated',
    colDelta: 'Change',
    narrative: 'Narrative Analysis',
    deltaTitle: 'Key Changes',
    scoreLabel: 'Risk Score',
    cashLabel: 'Cash Flow',
    paymentsLabel: 'Monthly Payments',
    debtLabel: 'Total Debt',
    assetsLabel: 'Total Assets',
    income: 'Revenue', expenses: 'Expenses',
    incomeHint: 'Annual variation', expenseHint: 'Annual variation',
    lateHint: 'Pending → turning late',
    collectionHint: '+: recovery, −: deterioration',
    rateHint: 'Impact on existing loans',
    loanHint: 'New credit (5-year term)',
    assetHint: 'Asset acquisition/sale',
    chartTitle: 'Dimension Comparison',
    impactLabel: 'Simulated Impact',
  };

  const set = useCallback((key, val) => {
    setParams(prev => ({ ...prev, [key]: val }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback(preset => {
    setParams(preset.params);
    setActivePreset(preset.id);
  }, []);

  const reset = useCallback(() => {
    setParams(DEFAULT_PARAMS);
    setActivePreset(null);
    setResult(null);
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/simulate', params);
      setResult(data);
    } catch {
      addToast('error', isFr ? 'Erreur' : 'Error', isFr ? 'La simulation a échoué' : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const impactCfg = result ? (IMPACT_CFG[result.impact] || IMPACT_CFG.neutral) : null;

  // Safely read breakdown — guards against old API response without breakdown field
  const baseBreak  = result?.baseline?.breakdown  || {};
  const simBreak   = result?.simulated?.breakdown || {};
  const deltaBreak = result?.delta?.breakdown     || {};

  // Chart data — dimension scores
  const chartData = result ? [
    { name: l.dimCashFlow, [l.colCurrent]: baseBreak.cashFlow   ?? 0, [l.colSimulated]: simBreak.cashFlow   ?? 0 },
    { name: l.dimInvoices, [l.colCurrent]: baseBreak.invoices   ?? 0, [l.colSimulated]: simBreak.invoices   ?? 0 },
    { name: l.dimDebt,     [l.colCurrent]: baseBreak.debt       ?? 0, [l.colSimulated]: simBreak.debt       ?? 0 },
    { name: l.dimLoan,     [l.colCurrent]: baseBreak.loanBurden ?? 0, [l.colSimulated]: simBreak.loanBurden ?? 0 },
  ] : [];

  const pct = v => `${v > 0 ? '+' : ''}${v}%`;
  const pctPos = v => `+${v}%`;

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
          {l.title}
        </h2>
        <p className="text-on-surface-variant dark:text-slate-400 mt-1">{l.subtitle}</p>
      </section>

      {/* ── Quick presets ───────────────────────────────────── */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6">
        <h3 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest mb-4">
          {l.presets}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                ${activePreset === p.id
                  ? 'border-primary bg-primary/10 dark:border-blue-400 dark:bg-blue-900/30'
                  : 'border-outline-variant/30 dark:border-slate-700 hover:border-primary/50 hover:bg-surface-container dark:hover:bg-slate-700/50'
                }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${p.color}`}>{p.icon}</span>
              <span className="text-[10px] font-bold text-on-surface dark:text-slate-200 leading-tight">
                {isFr ? p.iconFr : p.iconEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sliders ─────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6 space-y-8">

        {/* Section 1: Revenue & Costs */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-[18px] text-blue-500">attach_money</span>
            <h3 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{l.section1}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Slider
              label={l.income} hint={l.incomeHint}
              min={-50} max={100} value={params.incomeChange}
              onChange={v => set('incomeChange', v)}
              format={v => `${v > 0 ? '+' : ''}${v}%`}
            />
            <Slider
              label={l.expenses} hint={l.expenseHint}
              min={-50} max={100} value={params.expenseChange}
              onChange={v => set('expenseChange', v)}
              format={v => `${v > 0 ? '+' : ''}${v}%`}
            />
          </div>
        </div>

        <div className="border-t border-outline-variant/20 dark:border-slate-700" />

        {/* Section 2: Invoices */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-[18px] text-amber-500">receipt_long</span>
            <h3 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{l.section2}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Slider
              label={isFr ? 'Factures en retard supplémentaires' : 'Additional Late Invoices'} hint={l.lateHint}
              min={0} max={20} value={params.lateInvoiceCount}
              onChange={v => set('lateInvoiceCount', v)}
              format={v => `+${v}`}
            />
            <Slider
              label={isFr ? 'Amélioration du recouvrement (%)' : 'Collection Rate Change (%)'} hint={l.collectionHint}
              min={-50} max={50} value={params.collectionImprovement}
              onChange={v => set('collectionImprovement', v)}
              format={v => `${v > 0 ? '+' : ''}${v}%`}
            />
          </div>
        </div>

        <div className="border-t border-outline-variant/20 dark:border-slate-700" />

        {/* Section 3: Debt & Assets */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-[18px] text-purple-500">account_balance</span>
            <h3 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{l.section3}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Slider
              label={isFr ? 'Hausse du taux d\'intérêt (%)' : 'Interest Rate Change (%)'} hint={l.rateHint}
              min={-5} max={15} step={0.5} value={params.rateIncrease}
              onChange={v => set('rateIncrease', v)}
              format={v => `${v > 0 ? '+' : ''}${v}%`}
            />
            <Slider
              label={isFr ? 'Nouveau prêt (TND)' : 'New Loan (TND)'} hint={l.loanHint}
              min={0} max={500000} step={5000} value={params.newLoanAmount}
              onChange={v => set('newLoanAmount', v)}
              format={v => v === 0 ? '0' : `+${v.toLocaleString('fr-FR')}`}
            />
            <Slider
              label={isFr ? 'Variation des actifs (%)' : 'Asset Change (%)'} hint={l.assetHint}
              min={-100} max={100} value={params.assetChange}
              onChange={v => set('assetChange', v)}
              format={v => `${v > 0 ? '+' : ''}${v}%`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={run} disabled={loading}
            className="executive-gradient text-white text-sm font-bold px-8 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">{loading ? 'hourglass_top' : 'play_arrow'}</span>
            {loading ? l.running : l.run}
          </button>
          <button
            onClick={reset}
            className="text-sm font-medium text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 px-4 py-3 rounded-xl hover:bg-surface-container dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            {l.reset}
          </button>
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6 animate-fade-in">

          {/* Impact badge */}
          <div className="flex justify-center">
            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full ${impactCfg.bg} ${impactCfg.text} font-bold text-sm`}>
              <span className="material-symbols-outlined text-[18px]">{impactCfg.icon}</span>
              {l.impactLabel}: {isFr ? impactCfg.labelFr : impactCfg.labelEn}
              <span className="ml-1 opacity-70">({result.delta.scoreChange > 0 ? '+' : ''}{result.delta.scoreChange} pts)</span>
            </div>
          </div>

          {/* Score comparison — big numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline */}
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[18px] text-blue-600">radio_button_checked</span>
                <h3 className="text-sm font-bold text-on-surface dark:text-slate-100">{l.baselineTitle}</h3>
              </div>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-extrabold font-headline text-blue-600 dark:text-blue-400">{result.baseline.score}</span>
                <span className="text-lg text-on-surface-variant dark:text-slate-400 mb-1">/100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${result.baseline.score}%` }} />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-slate-400">{l.cashLabel}</span>
                  <span className={`font-medium ${result.baseline.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtAbs(result.baseline.cashFlow)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-slate-400">{l.paymentsLabel}</span>
                  <span className="font-medium text-on-surface dark:text-slate-200">{fmtAbs(result.baseline.monthlyPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-slate-400">{l.debtLabel}</span>
                  <span className="font-medium text-on-surface dark:text-slate-200">{fmtAbs(result.baseline.totalDebt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-slate-400">{l.assetsLabel}</span>
                  <span className="font-medium text-on-surface dark:text-slate-200">{fmtAbs(result.baseline.totalAssets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant dark:text-slate-400">{isFr ? 'Factures en retard' : 'Late Invoices'}</span>
                  <span className="font-medium text-on-surface dark:text-slate-200">{result.baseline.lateInvoices}</span>
                </div>
              </div>
            </div>

            {/* Simulated */}
            <div className={`bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6 border ${
              result.delta.scoreChange > 5 ? 'border-red-200/50 dark:border-red-800/30' :
              result.delta.scoreChange < -5 ? 'border-emerald-200/50 dark:border-emerald-800/30' :
              'border-outline-variant/30 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[18px] text-amber-500">science</span>
                <h3 className="text-sm font-bold text-on-surface dark:text-slate-100">{l.simTitle}</h3>
              </div>
              <div className="flex items-end gap-2 mb-4">
                <span className={`text-5xl font-extrabold font-headline ${
                  result.simulated.score > result.baseline.score ? 'text-red-600 dark:text-red-400' :
                  result.simulated.score < result.baseline.score ? 'text-emerald-600 dark:text-emerald-400' :
                  'text-on-surface dark:text-slate-100'
                }`}>{result.simulated.score}</span>
                <span className="text-lg text-on-surface-variant dark:text-slate-400 mb-1">/100</span>
                <span className={`ml-2 text-sm font-bold mb-1 ${result.delta.scoreChange > 0 ? 'text-red-600' : result.delta.scoreChange < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  ({result.delta.scoreChange > 0 ? '+' : ''}{result.delta.scoreChange})
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${
                    result.simulated.score >= 70 ? 'bg-red-500' :
                    result.simulated.score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${result.simulated.score}%` }}
                />
              </div>
              <div className="space-y-1.5 text-sm">
                {[
                  { label: l.cashLabel, base: result.baseline.cashFlow, sim: result.simulated.cashFlow, invert: false },
                  { label: l.paymentsLabel, base: result.baseline.monthlyPayments, sim: result.simulated.monthlyPayments, invert: true },
                  { label: l.debtLabel, base: result.baseline.totalDebt, sim: result.simulated.totalDebt, invert: true },
                  { label: l.assetsLabel, base: result.baseline.totalAssets, sim: result.simulated.totalAssets, invert: false },
                  { label: isFr ? 'Factures en retard' : 'Late Invoices', base: result.baseline.lateInvoices, sim: result.simulated.lateInvoices, invert: true, raw: true },
                ].map(({ label, base, sim, invert, raw }) => {
                  const delta = sim - base;
                  const worse = invert ? delta > 0 : delta < 0;
                  const better = invert ? delta < 0 : delta > 0;
                  return (
                    <div key={label} className="flex justify-between">
                      <span className="text-on-surface-variant dark:text-slate-400">{label}</span>
                      <span className={`font-medium ${worse ? 'text-red-600 dark:text-red-400' : better ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-slate-200'}`}>
                        {raw ? sim : fmtAbs(sim)}
                        {delta !== 0 && (
                          <span className="ml-1 text-xs opacity-70">
                            ({delta > 0 ? '+' : ''}{raw ? delta : Math.round(delta).toLocaleString('fr-FR')}{raw ? '' : ' TND'})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dimension breakdown table + chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Breakdown table */}
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">table_chart</span>
                {l.breakdown}
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/30 dark:border-slate-700">
                    <th className="pb-2 text-left text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{isFr ? 'Dimension' : 'Dimension'}</th>
                    <th className="pb-2 text-center text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{l.colCurrent}</th>
                    <th className="pb-2 text-center text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{l.colSimulated}</th>
                    <th className="pb-2 text-center text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">{l.colDelta}</th>
                  </tr>
                </thead>
                <tbody>
                  <DimRow label={`${l.dimScore} (global)`} base={result.baseline.score} sim={result.simulated.score} delta={result.delta.scoreChange} />
                  <DimRow label={l.dimCashFlow}  base={baseBreak.cashFlow   ?? '—'} sim={simBreak.cashFlow   ?? '—'} delta={deltaBreak.cashFlow   ?? 0} />
                  <DimRow label={l.dimInvoices}  base={baseBreak.invoices   ?? '—'} sim={simBreak.invoices   ?? '—'} delta={deltaBreak.invoices   ?? 0} />
                  <DimRow label={l.dimDebt}      base={baseBreak.debt       ?? '—'} sim={simBreak.debt       ?? '—'} delta={deltaBreak.debt       ?? 0} />
                  <DimRow label={l.dimLoan}      base={baseBreak.loanBurden ?? '—'} sim={simBreak.loanBurden ?? '—'} delta={deltaBreak.loanBurden ?? 0} />
                </tbody>
              </table>
              <p className="mt-3 text-[10px] text-on-surface-variant dark:text-slate-500 italic">
                {isFr ? '* Scores par dimension sur 100. Plus élevé = risque plus élevé.' : '* Dimension scores out of 100. Higher = more risk.'}
              </p>
            </div>

            {/* Bar chart */}
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
                {l.chartTitle}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey={l.colCurrent} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey={l.colSimulated} radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {chartData.map((entry, i) => {
                      const sim = entry[l.colSimulated];
                      const base = entry[l.colCurrent];
                      const color = sim > base + 2 ? '#ef4444' : sim < base - 2 ? '#10b981' : '#f59e0b';
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center text-[10px] text-on-surface-variant dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />{l.colCurrent}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />{isFr ? 'Simulé (dégradé)' : 'Simulated (worse)'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />{isFr ? 'Simulé (amélioré)' : 'Simulated (better)'}</span>
              </div>
            </div>
          </div>

          {/* Narrative */}
          {result.narrative && (
            <div className={`rounded-2xl p-6 ${impactCfg.bg}`}>
              <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${impactCfg.text}`}>
                <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                {l.narrative}
              </h3>
              <p className={`text-sm leading-relaxed ${impactCfg.text}`}>
                {isFr ? result.narrative.fr : result.narrative.en}
              </p>
            </div>
          )}

          {/* Key delta cards */}
          <div>
            <h3 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest mb-4">{l.deltaTitle}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: l.scoreLabel, value: result.delta.scoreChange, suffix: ' pts', invert: true },
                { label: l.cashLabel, value: result.delta.cashFlowChange, suffix: ' TND', invert: false },
                { label: l.paymentsLabel, value: result.delta.paymentsChange, suffix: ' TND', invert: true },
                { label: l.debtLabel, value: result.delta.debtChange, suffix: ' TND', invert: true },
              ].map(({ label, value, suffix, invert }) => {
                const worse = invert ? value > 0 : value < 0;
                const better = invert ? value < 0 : value > 0;
                return (
                  <div key={label} className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-4 border border-outline-variant/20 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                    <p className={`text-2xl font-extrabold font-headline ${worse ? 'text-red-600 dark:text-red-400' : better ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-slate-100'}`}>
                      {value > 0 ? '+' : ''}{typeof value === 'number' ? Math.round(value).toLocaleString('fr-FR') : value}{suffix}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
