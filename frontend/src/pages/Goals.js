import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

// ─── helpers ────────────────────────────────────────────────
const fmtTND = (n) =>
  typeof n === 'number' ? Math.round(n).toLocaleString('fr-FR') + ' TND' : '—';
const fmtDate = (s) =>
  s
    ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
    : '—';
// null means "N/A" (no assets / no income) — backend sentinel value
const fmtRatio = (n, isFr) =>
  n === null || n === undefined
    ? isFr
      ? 'Sans données'
      : 'No data'
    : Math.round(n * 10) / 10 + '%';

// ─── Category → API endpoint + filter ───────────────────────
// `s` is the full suggestion object — entityFilter tells us how to slice the data
function getEntityFetch(category, s) {
  const ef = s?.entityFilter || {};
  switch (category) {
    case 'invoices':
      return {
        path: '/invoices',
        filter: (d) =>
          d
            .filter((i) => i.status !== 'paid')
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 8),
      };
    case 'loans':
      return { path: '/loans', filter: (d) => d.slice(0, 8) };
    case 'transactions':
      return {
        path: '/transactions',
        filter: (d) => {
          let arr = d;
          if (ef.type) arr = arr.filter((t) => t.type === ef.type);
          if (ef.category) arr = arr.filter((t) => t.category === ef.category);
          return arr.sort((a, b) => b.amount - a.amount).slice(0, 8);
        },
      };
    case 'assets':
      return { path: '/assets', filter: (d) => d.slice(0, 8) };
    default:
      return null;
  }
}

// ─── Entity mini-renderers ───────────────────────────────────
function InvoiceRows({ items, isFr }) {
  const STATUS = {
    late: {
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      labelFr: 'En retard',
      labelEn: 'Late',
    },
    pending: {
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      labelFr: 'En attente',
      labelEn: 'Pending',
    },
    paid: {
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      labelFr: 'Payée',
      labelEn: 'Paid',
    },
  };
  if (!items.length) return <EmptyEntities isFr={isFr} />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-outline-variant/20 dark:border-slate-700">
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Client' : 'Client'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Montant' : 'Amount'}
          </th>
          <th className="text-center pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Statut' : 'Status'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Échéance' : 'Due'}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((inv) => {
          const s = STATUS[inv.status] || STATUS.pending;
          return (
            <tr
              key={inv._id}
              className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0"
            >
              <td className="py-2 pr-2 text-on-surface dark:text-slate-200 font-medium max-w-[120px] truncate">
                {inv.clientName}
              </td>
              <td className="py-2 text-right font-bold text-on-surface dark:text-slate-100 whitespace-nowrap">
                {fmtTND(inv.amount)}
              </td>
              <td className="py-2 text-center">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.cls}`}>
                  {isFr ? s.labelFr : s.labelEn}
                </span>
              </td>
              <td className="py-2 text-right text-on-surface-variant dark:text-slate-400 whitespace-nowrap">
                {fmtDate(inv.dueDate)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LoanRows({ items, isFr }) {
  if (!items.length) return <EmptyEntities isFr={isFr} />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-outline-variant/20 dark:border-slate-700">
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Capital' : 'Amount'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Taux' : 'Rate'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Durée' : 'Term'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Mensualité' : 'Monthly'}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((l) => (
          <tr
            key={l._id}
            className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0"
          >
            <td className="py-2 text-right font-bold text-on-surface dark:text-slate-100">
              {fmtTND(l.amount)}
            </td>
            <td className="py-2 text-right text-on-surface dark:text-slate-200">
              {l.interestRate}%
            </td>
            <td className="py-2 text-right text-on-surface-variant dark:text-slate-400">
              {l.duration} {isFr ? 'mois' : 'mo'}
            </td>
            <td className="py-2 text-right font-medium text-amber-600 dark:text-amber-400">
              {fmtTND(l.monthlyPayment)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionRows({ items, isFr }) {
  if (!items.length) return <EmptyEntities isFr={isFr} />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-outline-variant/20 dark:border-slate-700">
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Catégorie' : 'Category'}
          </th>
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Type' : 'Type'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Montant' : 'Amount'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Date' : 'Date'}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr
            key={t._id}
            className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0"
          >
            <td className="py-2 pr-2 text-on-surface dark:text-slate-200 font-medium">
              {t.category || '—'}
            </td>
            <td className="py-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}
              >
                {t.type === 'income' ? (isFr ? 'Revenu' : 'Income') : isFr ? 'Dépense' : 'Expense'}
              </span>
            </td>
            <td
              className={`py-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {fmtTND(t.amount)}
            </td>
            <td className="py-2 text-right text-on-surface-variant dark:text-slate-400">
              {fmtDate(t.date)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AssetRows({ items, isFr }) {
  if (!items.length) return <EmptyEntities isFr={isFr} />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-outline-variant/20 dark:border-slate-700">
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Actif' : 'Asset'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Valeur' : 'Value'}
          </th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">
            {isFr ? 'Amort.' : 'Depr.'}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((a) => (
          <tr
            key={a._id}
            className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0"
          >
            <td className="py-2 pr-2 text-on-surface dark:text-slate-200 font-medium">{a.name}</td>
            <td className="py-2 text-right font-bold text-on-surface dark:text-slate-100">
              {fmtTND(a.value)}
            </td>
            <td className="py-2 text-right text-on-surface-variant dark:text-slate-400">
              {a.depreciationRate}%/an
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyEntities({ isFr }) {
  return (
    <div className="text-center py-4 text-xs text-on-surface-variant dark:text-slate-500 italic">
      {isFr ? 'Aucune donnée disponible.' : 'No data available.'}
    </div>
  );
}

// ─── Animated expand panel (CSS grid trick — no JS measurement) ─
// grid-template-rows: 0fr → 1fr animates height from 0 to natural height
// Works perfectly with async content — no scrollHeight snapshots needed
function ExpandPanel({ open, children }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div style={{ overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  );
}

// ─── Priority config ─────────────────────────────────────────
const PRIORITY = {
  critical: {
    label: { fr: 'Critique', en: 'Critical' },
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
    border: 'border-red-200 dark:border-red-800/40',
  },
  high: {
    label: { fr: 'Élevé', en: 'High' },
    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    dot: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-800/40',
  },
  medium: {
    label: { fr: 'Moyen', en: 'Medium' },
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-400',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  low: {
    label: { fr: 'Faible', en: 'Low' },
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
  },
};

const CAT_ICON = {
  invoices: { icon: 'receipt_long', color: 'text-blue-500' },
  loans: { icon: 'account_balance', color: 'text-violet-500' },
  transactions: { icon: 'swap_horiz', color: 'text-emerald-500' },
  assets: { icon: 'inventory_2', color: 'text-amber-500' },
};

// ─── Urgency config per priority level ───────────────────────
const URGENCY = {
  critical: {
    icon: 'emergency',
    bar: 'bg-red-500',
    bannerCls: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30',
    iconCls: 'text-red-500',
    fr: "Intervention immédiate requise — chaque jour d'inaction aggrave la situation.",
    en: 'Immediate action required — every day of inaction worsens the situation.',
  },
  high: {
    icon: 'priority_high',
    bar: 'bg-orange-500',
    bannerCls: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/30',
    iconCls: 'text-orange-500',
    fr: 'Action prioritaire cette semaine — fort impact sur votre performance financière.',
    en: 'Priority action this week — high impact on your financial performance.',
  },
  medium: {
    icon: 'schedule',
    bar: 'bg-amber-400',
    bannerCls: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30',
    iconCls: 'text-amber-500',
    fr: "À planifier ce mois — contribue directement à l'atteinte de votre objectif.",
    en: 'Plan this month — directly contributes to reaching your target.',
  },
  low: {
    icon: 'info',
    bar: 'bg-slate-400',
    bannerCls: 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700',
    iconCls: 'text-slate-400',
    fr: 'Amélioration continue — optimise votre position à long terme.',
    en: 'Continuous improvement — strengthens your long-term position.',
  },
};

// ─── Split description into action steps ─────────────────────
function descToSteps(desc) {
  if (!desc) return [];
  const parts = desc
    .split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÉÈÊÎÏÔÙÛÜÇ])/u)
    .filter((p) => p.trim().length > 12);
  return parts.length >= 2 ? parts : [desc];
}

// ─── Expandable suggestion card ──────────────────────────────
function SuggestionCard({ s, category, isFr }) {
  const [open, setOpen] = useState(false);
  const [entities, setEntities] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const steps = descToSteps(s.description);
  const p = PRIORITY[s.priority] || PRIORITY.low;
  const urgency = URGENCY[s.priority] || URGENCY.low;

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && entities === null) {
      const cfg = getEntityFetch(category, s);
      if (!cfg) return;
      setDataLoading(true);
      try {
        const { data } = await api.get(cfg.path);
        const arr = Array.isArray(data)
          ? data
          : data.data || data.invoices || data.loans || data.transactions || data.assets || [];
        setEntities(cfg.filter(arr));
      } catch {
        setEntities([]);
      } finally {
        setDataLoading(false);
      }
    }
  }, [open, entities, category, s]);

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200 bg-white dark:bg-slate-800/80
      ${open ? 'border-primary/30 dark:border-blue-500/30 shadow-lg' : `${p.border} hover:shadow-md`}`}
    >
      {/* ── Card header ── */}
      <button className="w-full text-left p-4 flex items-start gap-3" onClick={toggle}>
        <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${p.dot}`} />
        <div className="flex-1 min-w-0">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${p.cls}`}
          >
            {p.label[isFr ? 'fr' : 'en']}
          </span>
          <p className="text-sm font-semibold text-on-surface dark:text-slate-100 leading-tight mt-1">
            {s.title}
          </p>
        </div>
        {s.metric && (
          <div className="shrink-0 text-right">
            <div className="text-xs font-bold text-on-surface dark:text-slate-100">
              {s.metric.value}
            </div>
            <div className="text-[9px] text-on-surface-variant dark:text-slate-400">
              {s.metric.label}
            </div>
          </div>
        )}
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant dark:text-slate-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* ── Always-visible body ── */}
      <div className="px-4 pb-3 pl-9">
        <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed mb-2">
          {s.description}
        </p>
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-blue-400 hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]">
            {open ? 'keyboard_arrow_up' : 'analytics'}
          </span>
          {open
            ? isFr
              ? "Masquer l'analyse"
              : 'Hide analysis'
            : isFr
              ? "Voir l'analyse détaillée"
              : 'View detailed analysis'}
        </button>
      </div>

      {/* ── Insight + Data expand panel ── */}
      <ExpandPanel open={open}>
        <div className="border-t border-outline-variant/15 dark:border-slate-700/60 mx-4" />
        <div className="px-4 pt-4 pb-5 pl-9 space-y-4">
          {/* ── Section 1: Urgency banner ── */}
          <div
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${urgency.bannerCls}`}
          >
            <span
              className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${urgency.iconCls}`}
            >
              {urgency.icon}
            </span>
            <p className={`text-[11px] font-semibold leading-snug ${urgency.iconCls}`}>
              {isFr ? urgency.fr : urgency.en}
            </p>
          </div>

          {/* ── Section 2: Action plan ── */}
          {steps.length > 0 && (
            <div className="bg-surface-container-low dark:bg-slate-700/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-[14px] text-primary dark:text-blue-400">
                  checklist
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400">
                  {isFr ? "Plan d'action" : 'Action plan'}
                </span>
              </div>
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 goals-enter"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-extrabold text-primary dark:text-blue-400">
                      {i + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface dark:text-slate-200 leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Section 3: Impact + Metric row ── */}
          {(s.impact || s.metric) && (
            <div
              className="grid grid-cols-1 gap-2.5"
              style={{ gridTemplateColumns: s.impact && s.metric ? '1fr auto' : '1fr' }}
            >
              {s.impact && (
                <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-lg px-3 py-2.5">
                  <span className="material-symbols-outlined text-[14px] text-emerald-500 shrink-0 mt-0.5">
                    trending_up
                  </span>
                  <div>
                    <p className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                      {isFr ? 'Impact attendu' : 'Expected impact'}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
                      {s.impact}
                    </p>
                  </div>
                </div>
              )}
              {s.metric && (
                <div className="flex flex-col justify-center border-l-2 border-primary/20 dark:border-blue-500/20 pl-3 min-w-[80px]">
                  <p className="text-[8px] text-on-surface-variant dark:text-slate-500 uppercase tracking-wider font-medium whitespace-nowrap">
                    {s.metric.label}
                  </p>
                  <p className="text-lg font-extrabold font-headline text-on-surface dark:text-slate-100 leading-none mt-0.5">
                    {s.metric.value}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Section 4: Live entity data ── */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="material-symbols-outlined text-[13px] text-on-surface-variant dark:text-slate-500">
                table_view
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-500">
                {isFr ? 'Données associées' : 'Related data'}
              </span>
              {entities !== null && (
                <span className="ml-auto text-[9px] text-on-surface-variant dark:text-slate-500 font-medium">
                  {entities.length} {isFr ? 'entrée(s)' : 'entries'}
                </span>
              )}
            </div>
            {dataLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <span className="material-symbols-outlined text-[20px] text-primary animate-spin">
                  progress_activity
                </span>
                <span className="text-xs text-on-surface-variant dark:text-slate-400">
                  {isFr ? 'Chargement...' : 'Loading...'}
                </span>
              </div>
            ) : entities !== null && entities.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-outline-variant/10 dark:border-slate-700/50">
                {category === 'invoices' && <InvoiceRows items={entities} isFr={isFr} />}
                {category === 'loans' && <LoanRows items={entities} isFr={isFr} />}
                {category === 'transactions' && <TransactionRows items={entities} isFr={isFr} />}
                {category === 'assets' && <AssetRows items={entities} isFr={isFr} />}
              </div>
            ) : entities !== null ? (
              <EmptyEntities isFr={isFr} />
            ) : null}
          </div>
        </div>
      </ExpandPanel>
    </div>
  );
}

// ─── Section block ───────────────────────────────────────────
function SectionBlock({ section, isFr, index = 0 }) {
  const catMeta = CAT_ICON[section.category] || { icon: 'lightbulb', color: 'text-primary' };
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="bg-surface-container-lowest dark:bg-slate-800/50 rounded-2xl goals-enter"
      style={{ animationDelay: `${index * 75 + 80}ms` }}
    >
      {/* section header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2.5 p-5 pb-4 rounded-t-2xl hover:bg-surface-container/50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <span className={`material-symbols-outlined text-[22px] ${catMeta.color}`}>
          {catMeta.icon}
        </span>
        <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 flex-1 text-left">
          {section.title}
        </h3>
        <span className="text-xs text-on-surface-variant dark:text-slate-500 mr-2">
          {section.suggestions?.length || 0} {isFr ? 'actions' : 'actions'}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant dark:text-slate-400 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
        >
          expand_less
        </span>
      </button>

      <ExpandPanel open={!collapsed}>
        <div className="px-5 pb-5 flex flex-col gap-3">
          {(section.suggestions || []).map((s) => (
            <SuggestionCard key={s.id} s={s} category={section.category} isFr={isFr} />
          ))}
        </div>
      </ExpandPanel>
    </div>
  );
}

// ─── Skeleton components ─────────────────────────────────────
function Sk({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

// ─── AI generation progress card ─────────────────────────────
// Shows a smooth bar that fills over `total` ms while the IA "thinks".
// Cycles the displayed step label so the user sees progress narration.
function GoalsProgress({ isFr, sc, progress, total }) {
  const STEPS_FR = [
    { at: 0, label: 'Collecte des données financières...' },
    { at: 18, label: 'Analyse des transactions et factures...' },
    { at: 38, label: 'Évaluation des prêts et de la dette...' },
    { at: 58, label: 'Calcul du score de santé cible...' },
    { at: 75, label: 'Génération des recommandations IA...' },
    { at: 92, label: 'Mise en forme du rapport...' },
  ];
  const STEPS_EN = [
    { at: 0, label: 'Collecting financial data...' },
    { at: 18, label: 'Analysing transactions and invoices...' },
    { at: 38, label: 'Evaluating loans and debt...' },
    { at: 58, label: 'Computing target health score...' },
    { at: 75, label: 'Generating AI recommendations...' },
    { at: 92, label: 'Formatting the report...' },
  ];
  const STEPS = isFr ? STEPS_FR : STEPS_EN;
  const current = [...STEPS].reverse().find((s) => progress >= s.at) || STEPS[0];
  const totalSec = (total / 1000).toFixed(1);

  return (
    <div className="rounded-2xl border border-outline-variant/20 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${sc ? `bg-gradient-to-br ${sc.gradient}` : 'bg-primary'}`}
        >
          <span
            className="material-symbols-outlined text-white text-[22px] animate-spin"
            style={{ animationDuration: '2s' }}
          >
            auto_awesome
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-extrabold font-headline text-on-surface dark:text-slate-100">
              {isFr ? 'Génération de la stratégie IA' : 'Generating AI strategy'}
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary tracking-wider">
              AI
            </span>
          </div>
          <p className="text-xs text-on-surface-variant dark:text-slate-400">
            {sc ? (isFr ? `Scénario : ${sc.labelFr}` : `Scenario: ${sc.labelEn}`) : ''}
            {' · '}
            {isFr ? `~${totalSec} s` : `~${totalSec} s`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold font-headline tabular-nums text-on-surface dark:text-slate-100">
            {progress}
            <span className="text-sm text-on-surface-variant">%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Shimmer */}
        <div
          className="absolute inset-y-0 w-20 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
          style={{ left: `${progress}%`, animation: 'goalsShimmer 1.4s ease-in-out infinite' }}
        />
      </div>

      {/* Current step */}
      <div className="flex items-center gap-2 text-sm">
        <span className="material-symbols-outlined text-[18px] text-primary animate-spin">
          progress_activity
        </span>
        <span className="text-on-surface dark:text-slate-200 font-medium">{current.label}</span>
      </div>

      {/* Steps timeline */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const done = progress > s.at + 5;
          const active = progress >= s.at && !done;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                done
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                  : active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-on-surface-variant dark:text-slate-500'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] shrink-0">
                {done ? 'check_circle' : active ? 'pending' : 'circle'}
              </span>
              <span className="truncate font-medium">{s.label.replace('...', '')}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes goalsShimmer {
          0%   { transform: translateX(-100%); opacity: 0;   }
          50%  {                                opacity: 0.9; }
          100% { transform: translateX(100%);  opacity: 0;   }
        }
      `}</style>
    </div>
  );
}

function GoalsSkeleton({ isFr, sc }) {
  return (
    <div className="space-y-5">
      {/* Hero banner skeleton */}
      <div
        className={`rounded-2xl p-6 ${sc ? `bg-gradient-to-br ${sc.gradient} opacity-60` : 'bg-slate-200 dark:bg-slate-700 animate-pulse'}`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 animate-pulse" />
            <div className="space-y-2">
              <Sk className="h-2.5 w-20 bg-white/30" />
              <Sk className="h-5 w-36 bg-white/30" />
            </div>
          </div>
          <div className="flex items-center gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="text-center space-y-1.5">
                <Sk className="h-2 w-16 mx-auto bg-white/25" />
                <Sk className="h-8 w-10 mx-auto bg-white/25" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-white/20 space-y-2">
          <Sk className="h-3 w-full bg-white/20" />
          <Sk className="h-3 w-3/4 bg-white/20" />
        </div>
      </div>

      {/* Metrics strip skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-3.5 flex items-center gap-3"
          >
            <Sk className="w-7 h-7 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Sk className="h-2 w-14" />
              <Sk className="h-3.5 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Scenario pills skeleton */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sk className="h-3 w-20" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Sk key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>

      {/* Section blocks skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl">
          {/* section header */}
          <div className="flex items-center gap-2.5 p-5 pb-4">
            <Sk className="w-5 h-5 rounded" />
            <Sk className="h-4 w-40 flex-1" />
            <Sk className="h-3 w-16" />
            <Sk className="w-5 h-5 rounded" />
          </div>
          {/* suggestion cards */}
          <div className="px-5 pb-5 space-y-3">
            {Array.from({ length: i < 3 ? 2 : 1 }).map((_, j) => (
              <div
                key={j}
                className="rounded-xl border-2 border-outline-variant/20 dark:border-slate-700 p-4"
              >
                <div className="flex items-start gap-3">
                  <Sk className="w-2 h-2 rounded-full mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Sk className="h-2.5 w-16 rounded-full" />
                    <Sk className="h-4 w-4/5" />
                    <Sk className="h-3 w-full" />
                    <Sk className="h-3 w-2/3" />
                    <Sk className="h-3 w-24 mt-1" />
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <Sk className="h-4 w-16" />
                    <Sk className="h-2.5 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scenario catalogue ──────────────────────────────────────
const SCENARIOS = [
  {
    id: 'growth',
    icon: 'rocket_launch',
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300',
    chipCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    labelFr: 'Croissance Rapide',
    labelEn: 'Rapid Growth',
    tagFr: 'Expansion',
    tagEn: 'Expansion',
    descFr:
      'Maximisez vos revenus, investissez intelligemment et développez votre portefeuille clients.',
    descEn: 'Maximize revenue, invest smartly and grow your client portfolio.',
    exampleFr:
      "Idéal si votre trésorerie est solide (> 3 mois de charges), votre dette est maîtrisée, et vous voulez accélérer : nouveaux marchés, embauches, ou lancement de produits. L'IA analyse vos meilleurs clients et catégories de revenus pour cibler où réinvestir.",
    exampleEn:
      'Ideal when your cash is strong (> 3 months of expenses), debt is under control, and you want to accelerate: new markets, hiring, or product launches. The AI analyses your top clients and revenue categories to target where to reinvest.',
    bulletsFr: [
      'Réinvestir le surplus dans vos meilleures sources de revenus',
      "Amplifier les clients top-3 par chiffre d'affaires",
      'Optimiser votre structure fiscale pour libérer du capital',
    ],
    bulletsEn: [
      'Reinvest surplus into your best revenue sources',
      'Amplify top-3 clients by turnover',
      'Optimise tax structure to free up capital',
    ],
  },
  {
    id: 'stability',
    icon: 'shield',
    gradient: 'from-blue-500 to-indigo-600',
    ring: 'ring-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300',
    chipCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    labelFr: 'Stabilisation',
    labelEn: 'Stabilization',
    tagFr: 'Équilibre',
    tagEn: 'Balance',
    descFr:
      'Sécurisez votre trésorerie, réduisez le risque et maintenez un équilibre financier durable.',
    descEn: 'Secure your cash flow, reduce risk and maintain a durable financial balance.',
    exampleFr:
      "Idéal si vos revenus fluctuent, votre trésorerie est tendue ou si vous sortez d'un trimestre difficile. L'IA cible vos dépenses volatiles et vos créances lentes pour rétablir une base prévisible.",
    exampleEn:
      "Ideal when your revenue fluctuates, cash is tight, or you're coming out of a tough quarter. The AI targets your volatile expenses and slow receivables to rebuild a predictable base.",
    bulletsFr: [
      'Constituer une réserve équivalente à 3 mois de charges',
      'Identifier et supprimer les dépenses non essentielles',
      'Réduire la variance mensuelle des revenus',
    ],
    bulletsEn: [
      'Build a reserve equal to 3 months of expenses',
      'Identify and cut non-essential spending',
      'Reduce monthly revenue variance',
    ],
  },
  {
    id: 'debt_reduction',
    icon: 'savings',
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-800/40 dark:text-violet-300',
    chipCls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    labelFr: 'Désendettement',
    labelEn: 'Debt Reduction',
    tagFr: 'Remboursement',
    tagEn: 'Repayment',
    descFr: "Réduisez votre endettement méthodiquement et libérez votre capacité d'investissement.",
    descEn: 'Methodically reduce your debt and free up your investment capacity.',
    exampleFr:
      "Idéal si vos mensualités d'emprunts dépassent 30% de vos revenus ou si votre ratio dette/actifs est > 60%. L'IA classe vos prêts par taux d'intérêt et propose un plan de remboursement accéléré sur les plus coûteux.",
    exampleEn:
      'Ideal when your loan payments exceed 30% of your income or your debt-to-assets ratio is > 60%. The AI ranks your loans by interest rate and proposes an accelerated repayment plan on the most expensive.',
    bulletsFr: [
      'Cibler en priorité le prêt au taux le plus élevé',
      'Renégocier ou refinancer les dettes à taux variables',
      "Bloquer tout nouvel endettement jusqu'à stabilisation",
    ],
    bulletsEn: [
      'Prioritise the loan with the highest interest rate',
      'Renegotiate or refinance variable-rate debts',
      'Block any new borrowing until stabilisation',
    ],
  },
  {
    id: 'revenue_optimization',
    icon: 'trending_up',
    gradient: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300',
    chipCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    labelFr: 'Optimisation Revenus',
    labelEn: 'Revenue Optimization',
    tagFr: 'Rentabilité',
    tagEn: 'Profitability',
    descFr:
      'Optimisez vos flux de facturation, accélérez les encaissements et amplifiez vos meilleures sources.',
    descEn:
      'Optimize your billing flows, accelerate collections and amplify your best revenue sources.',
    exampleFr:
      "Idéal si votre activité génère des ventes saines mais vos encaissements tardent : factures en retard, clients lents, marges compressées par les délais. L'IA pointe les clients à relancer et les sources de revenu sous-exploitées.",
    exampleEn:
      'Ideal when your sales are healthy but collections are slow: late invoices, slow-paying clients, margins squeezed by delays. The AI highlights clients to chase and under-exploited revenue sources.',
    bulletsFr: [
      'Relancer immédiatement les factures en retard > 30 jours',
      'Raccourcir les délais de paiement standard à 15 jours',
      'Dupliquer la stratégie de vos 3 meilleures catégories',
    ],
    bulletsEn: [
      'Immediately chase invoices overdue > 30 days',
      'Shorten standard payment terms to 15 days',
      'Replicate the strategy of your top 3 revenue categories',
    ],
  },
  {
    id: 'recovery',
    icon: 'emergency',
    gradient: 'from-red-500 to-rose-600',
    ring: 'ring-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    badge: 'bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300',
    chipCls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    labelFr: 'Redressement',
    labelEn: 'Emergency Recovery',
    tagFr: 'Urgent',
    tagEn: 'Urgent',
    descFr:
      'Mode urgence : actions immédiates pour stabiliser la trésorerie et éviter la cessation de paiement.',
    descEn: 'Emergency mode: immediate actions to stabilize cash flow and avoid payment default.',
    exampleFr:
      "À activer si votre trésorerie est négative ou si le ratio dépenses/revenus dépasse 150%. L'IA identifie les coupes immédiates, les créances à recouvrer en urgence, et les négociations à ouvrir pour éviter le défaut de paiement.",
    exampleEn:
      'Activate if your cash flow is negative or your expense/revenue ratio exceeds 150%. The AI identifies immediate cuts, receivables to collect urgently, and negotiations to open to avoid payment default.',
    bulletsFr: [
      'Geler toutes les dépenses non-critiques cette semaine',
      'Recouvrer en urgence toutes les factures en retard',
      'Négocier des délais avec fournisseurs et créanciers',
    ],
    bulletsEn: [
      'Freeze all non-critical expenses this week',
      'Urgently collect all overdue invoices',
      'Negotiate extensions with suppliers and creditors',
    ],
  },
  {
    id: 'excellence',
    icon: 'workspace_premium',
    gradient: 'from-slate-600 to-slate-800',
    ring: 'ring-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/40',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    chipCls: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300',
    labelFr: 'Excellence Opérationnelle',
    labelEn: 'Operational Excellence',
    tagFr: 'Équilibré',
    tagEn: 'Balanced',
    descFr:
      'Optimisation équilibrée de toutes les dimensions financières pour une performance maximale.',
    descEn: 'Balanced optimization of all financial dimensions for peak performance.',
    exampleFr:
      "Idéal si votre entreprise est déjà saine (santé > 70) et que vous cherchez à atteindre le top 10% du secteur. L'IA ajuste chaque indicateur au centième près : ratios, marges, délais, diversification.",
    exampleEn:
      'Ideal when your business is already healthy (health > 70) and you aim to reach the top 10% of your sector. The AI fine-tunes every indicator: ratios, margins, delays, diversification.',
    bulletsFr: [
      'Viser un ratio dépenses < 65% par catégorie',
      'Réduire le taux de retard des factures sous 5%',
      "Diversifier pour qu'aucun client ne dépasse 20% du CA",
    ],
    bulletsEn: [
      'Target an expense ratio < 65% per category',
      'Reduce invoice late rate below 5%',
      'Diversify so no single client exceeds 20% of revenue',
    ],
  },
];

// ─── Scenario picker card ────────────────────────────────────
function ScenarioCard({ scenario, selected, recommended, disabled, onClick, isFr }) {
  const sc = SCENARIOS.find((s) => s.id === scenario.id) || SCENARIOS[0];
  const [detailOpen, setDetailOpen] = useState(false);
  const bullets = (isFr ? sc.bulletsFr : sc.bulletsEn) || [];

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all duration-200
        ${
          disabled
            ? 'border-outline-variant/20 dark:border-slate-700/40 bg-surface-container/60 dark:bg-slate-800/30'
            : selected
              ? `border-transparent ring-2 ${sc.ring} ${sc.bg} shadow-lg scale-[1.02]`
              : recommended
                ? `border-transparent ring-2 ring-emerald-400 dark:ring-emerald-500 ${sc.bg} shadow-md hover:scale-[1.01] bg-surface-container-lowest dark:bg-slate-800`
                : 'border-outline-variant/30 dark:border-slate-700 hover:border-outline-variant dark:hover:border-slate-600 hover:shadow-md hover:scale-[1.01] bg-surface-container-lowest dark:bg-slate-800'
        }`}
    >
      {/* Recommended flag */}
      {recommended && !selected && !disabled && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap z-20 goals-pop">
          <span className="material-symbols-outlined text-[11px]">recommend</span>
          {isFr ? 'Recommandé pour vous' : 'Recommended for you'}
        </div>
      )}

      {/* Not-suitable badge */}
      {disabled && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-200/90 dark:bg-slate-700/80 rounded-full px-2 py-0.5 z-20">
          <span className="material-symbols-outlined text-[11px] text-on-surface-variant/60 dark:text-slate-400">
            block
          </span>
          <span className="text-[8px] font-bold text-on-surface-variant/60 dark:text-slate-500 uppercase tracking-wide">
            {isFr ? 'Non adapté' : 'Not suitable'}
          </span>
        </div>
      )}

      {/* Main clickable area — selects the scenario */}
      <button
        type="button"
        onClick={() => !disabled && onClick(scenario.id)}
        disabled={disabled}
        className={`w-full text-left p-5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sc.gradient} flex items-center justify-center mb-3 shadow-sm ${disabled ? 'opacity-30' : ''}`}
        >
          <span className="material-symbols-outlined text-white text-[20px]">{sc.icon}</span>
        </div>
        <div className={`${disabled ? 'opacity-35' : ''} pr-6`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${sc.badge}`}
            >
              {isFr ? sc.tagFr : sc.tagEn}
            </span>
            {selected && !disabled && (
              <span className="ml-auto material-symbols-outlined text-[16px] text-primary">
                check_circle
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 mb-1">
            {isFr ? sc.labelFr : sc.labelEn}
          </h3>
          <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-snug">
            {isFr ? sc.descFr : sc.descEn}
          </p>
          {disabled && (
            <p className="text-[10px] text-on-surface-variant/50 dark:text-slate-600 mt-2 italic">
              {isFr
                ? "Stabilisez d'abord votre situation financière."
                : 'Stabilise your finances first.'}
            </p>
          )}
        </div>
      </button>

      {/* Info toggle button (top-right, absolute) */}
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDetailOpen((o) => !o);
          }}
          aria-label={isFr ? 'Voir un exemple' : 'See example'}
          className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center z-20 transition-all
            ${
              detailOpen
                ? `bg-gradient-to-br ${sc.gradient} text-white shadow-md`
                : 'bg-white/80 dark:bg-slate-700/80 text-on-surface-variant dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm backdrop-blur-sm'
            }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {detailOpen ? 'close' : 'info'}
          </span>
        </button>
      )}

      {/* Expandable detail panel — CSS grid trick for smooth height animation */}
      {!disabled && (
        <div
          className="grid transition-all duration-300 ease-out"
          style={{ gridTemplateRows: detailOpen ? '1fr' : '0fr' }}
        >
          <div style={{ minHeight: 0, overflow: 'hidden' }}>
            <div className="border-t border-outline-variant/20 dark:border-slate-700/60 mx-5" />
            <div className="px-5 pt-3.5 pb-4 space-y-3">
              {/* Example scenario */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[13px] text-primary dark:text-blue-400">
                    lightbulb
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400">
                    {isFr ? 'Exemple concret' : 'Real example'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface dark:text-slate-300 leading-relaxed">
                  {isFr ? sc.exampleFr : sc.exampleEn}
                </p>
              </div>

              {/* Key actions */}
              {bullets.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-[13px] text-primary dark:text-blue-400">
                      checklist
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-slate-400">
                      {isFr ? 'Actions-clés' : 'Key actions'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bullets.map((b, i) => (
                      <span
                        key={i}
                        className={`text-[10px] font-medium px-2 py-1 rounded-lg leading-tight ${sc.chipCls}`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function Goals() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100, smooth fill
  const [progressTotal, setProgressTotal] = useState(0); // ms target
  const [resultKey, setResultKey] = useState(0);
  const [recommendedScenario, setRecommendedScenario] = useState(null);
  const [validScenarios, setValidScenarios] = useState(null); // null = all valid (not yet loaded)
  const { addToast } = useToast();
  const { lang } = useLang();
  const isFr = lang === 'fr';

  // Fetch recommended scenario + valid scenarios on mount
  useEffect(() => {
    api
      .get('/ai/goals/recommended')
      .then(({ data }) => {
        if (data?.recommendedScenario) setRecommendedScenario(data.recommendedScenario);
        if (data?.validScenarios) setValidScenarios(data.validScenarios);
      })
      .catch(() => {
        /* silently ignore — flags are optional */
      });
  }, []);

  const l = isFr
    ? {
        title: 'Stratégie',
        subtitle:
          "Définissez votre cap et laissez l'IA analyser toute votre activité pour vous guider.",
        chooseTitle: 'Choisissez votre scénario',
        chooseHint:
          "L'IA adapte ses recommandations à chaque dimension financière selon l'objectif sélectionné.",
        analyzeBtn: "Analyser avec l'IA",
        analyzing: 'Analyse en cours...',
        changeScenario: 'Changer de scénario',
        currentScore: 'Santé financière',
        targetScore: 'Objectif santé',
        timeframe: 'Horizon',
        cashFlow: 'Flux de trésorerie',
        lateInv: 'Factures en retard',
        totalDebt: 'Endettement',
        expRatio: 'Ratio dépenses',
        activeScenario: 'Scénario actif :',
        totalSugg: 'recommandations',
        compareCTA: 'Analyser un autre scénario',
        compareHint: 'Comparez différents objectifs pour choisir la meilleure stratégie.',
      }
    : {
        title: 'Strategy',
        subtitle: 'Set your direction and let the AI analyse your entire activity to guide you.',
        chooseTitle: 'Choose your scenario',
        chooseHint:
          'The AI adapts its recommendations to each financial dimension based on the selected goal.',
        analyzeBtn: 'Analyse with AI',
        analyzing: 'Analysing...',
        changeScenario: 'Change scenario',
        currentScore: 'Financial health',
        targetScore: 'Health target',
        timeframe: 'Timeframe',
        cashFlow: 'Cash flow',
        lateInv: 'Late invoices',
        totalDebt: 'Total debt',
        expRatio: 'Expense ratio',
        activeScenario: 'Active scenario:',
        totalSugg: 'recommendations',
        compareCTA: 'Analyse another scenario',
        compareHint: 'Compare different goals to choose the best strategy.',
      };

  const analyse = useCallback(
    async (scenarioId) => {
      if (!scenarioId) return;
      setSelectedScenario(scenarioId);
      setLoading(true);
      // Random target between 3.5 s and 5.5 s — keeps the AI generation cinematic
      // even if the API responds in <1 s. progressTotal is read by the bar below.
      const target = 3500 + Math.floor(Math.random() * 2000);
      setProgressTotal(target);
      setProgress(0);
      const startedAt = Date.now();
      if (!result) setResult(null);

      // Smooth ticker — drives the bar to ~95% over `target` then waits for resolve
      const tick = () => {
        const elapsed = Date.now() - startedAt;
        const ratio = Math.min(elapsed / target, 0.95);
        // ease-out so the bar slows down before completion
        const eased = 1 - Math.pow(1 - ratio, 2);
        setProgress(Math.round(eased * 95));
      };
      const tickerId = setInterval(tick, 80);

      try {
        // Run the API call in parallel with the minimum delay
        const apiPromise = api.get(`/ai/goals/${scenarioId}?language=${lang}`);
        const minDelay = new Promise((resolve) => setTimeout(resolve, target));
        const [resp] = await Promise.all([apiPromise, minDelay]);

        clearInterval(tickerId);
        setProgress(100);
        // tiny delay so users see the bar reach 100 before the result swap
        await new Promise((r) => setTimeout(r, 220));

        const data = resp.data;
        setResult(data);
        setResultKey((k) => k + 1);
        if (data?.recommendedScenario) setRecommendedScenario(data.recommendedScenario);
        if (data?.validScenarios) setValidScenarios(data.validScenarios);
      } catch {
        clearInterval(tickerId);
        setResult(null);
        addToast(
          'error',
          isFr ? 'Erreur' : 'Error',
          isFr ? 'Analyse impossible' : 'Analysis failed'
        );
      } finally {
        setLoading(false);
        setProgress(0);
      }
    },
    [lang, isFr, addToast, result]
  );

  const handleScenarioClick = (id) => {
    setSelectedScenario(id);
    setResult(null);
    setResultKey(0);
  };

  // Auto-scroll to result section each time a fresh analysis lands
  useEffect(() => {
    if (result && resultRef.current) {
      const t = setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [resultKey, result]);

  const sc = selectedScenario ? SCENARIOS.find((s) => s.id === selectedScenario) : null;
  const totalSugg = result
    ? result.sections.reduce((a, s) => a + (s.suggestions?.length || 0), 0)
    : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <section className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[22px]">flag</span>
            <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
              {l.title}
            </h2>
          </div>
          <p className="text-on-surface-variant dark:text-slate-400 mt-0.5 max-w-xl">
            {l.subtitle}
          </p>
        </div>
        {result && (
          <button
            onClick={() => {
              setResult(null);
              setResultKey(0);
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 transition-colors goals-fade"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {l.changeScenario}
          </button>
        )}
      </section>

      {/* ── Scenario picker ─────────────────────────────────── */}
      {!result && !loading && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6 goals-enter">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 mb-1">
              {l.chooseTitle}
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">{l.chooseHint}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 pt-2 items-start">
            {SCENARIOS.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                selected={selectedScenario === scenario.id}
                recommended={scenario.id === recommendedScenario}
                disabled={validScenarios !== null && !validScenarios.includes(scenario.id)}
                onClick={handleScenarioClick}
                isFr={isFr}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <button
              disabled={!selectedScenario || loading}
              onClick={() => analyse(selectedScenario)}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition-all
                ${
                  selectedScenario && !loading
                    ? `bg-gradient-to-r ${sc?.gradient || 'from-blue-500 to-indigo-600'} text-white hover:opacity-90 shadow-lg hover:shadow-xl hover:scale-105`
                    : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant dark:text-slate-400 cursor-not-allowed opacity-60'
                }`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  {l.analyzing}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  {l.analyzeBtn}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading — AI generation progress bar (3.5–5.5 s) ── */}
      {loading && !result && (
        <div className="goals-enter">
          <GoalsProgress isFr={isFr} sc={sc} progress={progress} total={progressTotal} />
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {result && sc && (
        <div
          ref={resultRef}
          className="relative space-y-5 goals-enter scroll-mt-24"
          key={resultKey}
        >
          {/* Switching overlay — visible while loading a new scenario over an existing result */}
          {loading && (
            <div className="absolute inset-0 z-40 rounded-2xl bg-white/30 dark:bg-slate-950/40 backdrop-blur-[3px] flex items-start justify-center pt-10 goals-fade pointer-events-none">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full px-5 py-2.5 shadow-xl border border-outline-variant/20 pointer-events-auto">
                <span className="material-symbols-outlined text-[17px] text-primary animate-spin">
                  progress_activity
                </span>
                <span className="text-xs font-bold text-primary dark:text-blue-400">
                  {isFr ? 'Changement de scénario...' : 'Switching scenario...'}
                </span>
              </div>
            </div>
          )}

          {/* Hero banner */}
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${sc.gradient} p-6 text-white shadow-lg`}
          >
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-32 w-24 h-24 rounded-full bg-white/5 translate-y-8" />
            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">{sc.icon}</span>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-0.5">
                    {isFr ? sc.tagFr : sc.tagEn}
                  </div>
                  <h3 className="text-xl font-extrabold font-headline">
                    {isFr ? sc.labelFr : sc.labelEn}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-5 flex-wrap">
                {/* Score block */}
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                      {l.currentScore}
                    </div>
                    <div className="text-3xl font-extrabold font-headline leading-none">
                      {result.currentMetrics?.score ?? '—'}
                    </div>
                    <div className="text-[9px] text-white/40 mt-0.5">/ 100</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-[18px] text-white/40">
                      arrow_forward
                    </span>
                    {/* Progress bar */}
                    {result.currentMetrics?.score != null && result.targetScore != null && (
                      <div className="w-14 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/70 rounded-full"
                          style={{
                            width: `${Math.min(100, (result.currentMetrics.score / result.targetScore) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                      {l.targetScore}
                    </div>
                    <div className="text-3xl font-extrabold font-headline leading-none">
                      {result.targetScore ?? '—'}
                    </div>
                    <div className="text-[9px] text-white/40 mt-0.5 flex items-center gap-0.5 justify-center">
                      <span className="material-symbols-outlined text-[9px]">arrow_upward</span>
                      {isFr ? 'meilleur' : 'better'}
                    </div>
                  </div>
                </div>
                <div className="text-center border-l border-white/20 pl-5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                    {l.timeframe}
                  </div>
                  <div className="text-sm font-bold">{result.timeframe ?? '—'}</div>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                  {totalSugg} {l.totalSugg}
                </div>
              </div>
            </div>
            {result.headline && (
              <div className="relative z-10 mt-5 pt-5 border-t border-white/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-white/60 mt-0.5 shrink-0">
                  auto_stories
                </span>
                <p className="text-sm text-white/90 leading-relaxed">{result.headline}</p>
              </div>
            )}
          </div>

          {/* Scenario alignment warning */}
          {result.scenarioWarning?.show && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 goals-slide-down">
              <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                warning
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  {isFr
                    ? 'Scénario peu adapté à votre situation'
                    : 'Scenario misaligned with your situation'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {isFr ? result.scenarioWarning.messageFr : result.scenarioWarning.messageEn}
                </p>
                {result.scenarioWarning.suggestedScenario && (
                  <button
                    onClick={() => analyse(result.scenarioWarning.suggestedScenario)}
                    disabled={loading}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    {isFr
                      ? `Passer au scénario "${SCENARIOS.find((s) => s.id === result.scenarioWarning.suggestedScenario)?.labelFr}"`
                      : `Switch to "${SCENARIOS.find((s) => s.id === result.scenarioWarning.suggestedScenario)?.labelEn}" scenario`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Metrics strip */}
          {result.currentMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: l.cashFlow,
                  value: fmtTND(result.currentMetrics.cashFlow),
                  icon: 'account_balance_wallet',
                  good: result.currentMetrics.cashFlow >= 0,
                },
                {
                  label: l.lateInv,
                  value:
                    result.currentMetrics.lateInvoiceCount + (isFr ? ' facture(s)' : ' invoice(s)'),
                  icon: 'warning',
                  good: result.currentMetrics.lateInvoiceCount === 0,
                },
                {
                  label: l.totalDebt,
                  value: fmtTND(result.currentMetrics.totalDebt),
                  icon: 'account_balance',
                  good:
                    result.currentMetrics.debtToAsset !== null &&
                    result.currentMetrics.debtToAsset < 0.5,
                },
                {
                  label: l.expRatio,
                  value: fmtRatio(
                    result.currentMetrics.expenseRatio !== null
                      ? result.currentMetrics.expenseRatio * 100
                      : null,
                    isFr
                  ),
                  icon: 'pie_chart',
                  good:
                    result.currentMetrics.expenseRatio !== null &&
                    result.currentMetrics.expenseRatio < 0.7,
                },
              ].map(({ label, value, icon, good }, i) => (
                <div
                  key={label}
                  className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-3.5 flex items-center gap-3 goals-enter"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${good ? 'text-emerald-500' : 'text-amber-500'}`}
                  >
                    {icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium truncate">
                      {label}
                    </div>
                    <div className="text-sm font-bold text-on-surface dark:text-slate-100 truncate">
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scenario switcher pills */}
          <div
            className="flex items-center gap-2 flex-wrap goals-fade"
            style={{ animationDelay: '60ms' }}
          >
            <span className="text-xs text-on-surface-variant dark:text-slate-400 font-medium shrink-0">
              {l.activeScenario}
            </span>
            {SCENARIOS.map((s) => {
              const isValid = !validScenarios || validScenarios.includes(s.id);
              const isActive = s.id === selectedScenario;
              return (
                <button
                  key={s.id}
                  disabled={loading || !isValid}
                  onClick={() => isValid && analyse(s.id)}
                  title={
                    !isValid
                      ? isFr
                        ? 'Non adapté à votre situation actuelle'
                        : 'Not suitable for your current situation'
                      : undefined
                  }
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all
                    ${
                      isActive
                        ? `bg-gradient-to-r ${s.gradient} text-white shadow-sm`
                        : !isValid
                          ? 'bg-surface-container/50 dark:bg-slate-800/50 text-on-surface-variant/30 dark:text-slate-700 cursor-not-allowed line-through decoration-1'
                          : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-high dark:hover:bg-slate-600 disabled:opacity-50'
                    }`}
                >
                  {isFr ? s.labelFr : s.labelEn}
                </button>
              );
            })}
          </div>

          {/* Suggestion sections — single column, full width, collapsible */}
          <div className="flex flex-col gap-4">
            {(result.sections || []).map((section, i) => (
              <SectionBlock key={section.category} section={section} isFr={isFr} index={i} />
            ))}
          </div>

          {/* Bottom CTA */}
          <div
            className="flex items-center justify-between rounded-2xl bg-surface-container-lowest dark:bg-slate-800 p-5 flex-wrap gap-4 goals-enter"
            style={{ animationDelay: '380ms' }}
          >
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-slate-100">
                {l.compareCTA}
              </p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400">{l.compareHint}</p>
            </div>
            <button
              onClick={() => {
                setResult(null);
                setResultKey(0);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container dark:bg-slate-700 text-sm font-bold text-on-surface dark:text-slate-200 hover:bg-surface-container-high dark:hover:bg-slate-600 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              {l.changeScenario}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
