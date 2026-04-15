import { useState, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

// ─── helpers ────────────────────────────────────────────────
const fmtTND  = n => typeof n === 'number' ? Math.round(n).toLocaleString('fr-FR') + ' TND' : '—';
const fmtDate = s => s ? new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
// null means "N/A" (no assets / no income) — backend sentinel value
const fmtRatio = (n, isFr) =>
  n === null || n === undefined ? (isFr ? 'Sans données' : 'No data') :
  (Math.round(n * 10) / 10) + '%';

// ─── Category → API endpoint + filter ───────────────────────
function getEntityFetch(category, suggestionId) {
  switch (category) {
    case 'invoices':     return { path: '/invoices',     filter: d => d.filter(i => i.status !== 'paid').sort((a,b) => b.amount - a.amount).slice(0,8) };
    case 'loans':        return { path: '/loans',        filter: d => d.slice(0,8) };
    case 'transactions': return { path: '/transactions', filter: d => d.sort((a,b) => b.amount - a.amount).slice(0,8) };
    case 'assets':       return { path: '/assets',       filter: d => d.slice(0,8) };
    default:             return null;
  }
}

// ─── Entity mini-renderers ───────────────────────────────────
function InvoiceRows({ items, isFr }) {
  const STATUS = {
    late:    { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',    labelFr: 'En retard', labelEn: 'Late'    },
    pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', labelFr: 'En attente', labelEn: 'Pending' },
    paid:    { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', labelFr: 'Payée', labelEn: 'Paid' },
  };
  if (!items.length) return <EmptyEntities isFr={isFr} />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-outline-variant/20 dark:border-slate-700">
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Client' : 'Client'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Montant' : 'Amount'}</th>
          <th className="text-center pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Statut' : 'Status'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Échéance' : 'Due'}</th>
        </tr>
      </thead>
      <tbody>
        {items.map(inv => {
          const s = STATUS[inv.status] || STATUS.pending;
          return (
            <tr key={inv._id} className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0">
              <td className="py-2 pr-2 text-on-surface dark:text-slate-200 font-medium max-w-[120px] truncate">{inv.clientName}</td>
              <td className="py-2 text-right font-bold text-on-surface dark:text-slate-100 whitespace-nowrap">{fmtTND(inv.amount)}</td>
              <td className="py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${s.cls}`}>{isFr ? s.labelFr : s.labelEn}</span></td>
              <td className="py-2 text-right text-on-surface-variant dark:text-slate-400 whitespace-nowrap">{fmtDate(inv.dueDate)}</td>
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
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Capital' : 'Amount'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Taux' : 'Rate'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Durée' : 'Term'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Mensualité' : 'Monthly'}</th>
        </tr>
      </thead>
      <tbody>
        {items.map(l => (
          <tr key={l._id} className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0">
            <td className="py-2 text-right font-bold text-on-surface dark:text-slate-100">{fmtTND(l.amount)}</td>
            <td className="py-2 text-right text-on-surface dark:text-slate-200">{l.interestRate}%</td>
            <td className="py-2 text-right text-on-surface-variant dark:text-slate-400">{l.duration} {isFr ? 'mois' : 'mo'}</td>
            <td className="py-2 text-right font-medium text-amber-600 dark:text-amber-400">{fmtTND(l.monthlyPayment)}</td>
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
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Catégorie' : 'Category'}</th>
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Type' : 'Type'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Montant' : 'Amount'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Date' : 'Date'}</th>
        </tr>
      </thead>
      <tbody>
        {items.map(t => (
          <tr key={t._id} className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0">
            <td className="py-2 pr-2 text-on-surface dark:text-slate-200 font-medium">{t.category || '—'}</td>
            <td className="py-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                {t.type === 'income' ? (isFr ? 'Revenu' : 'Income') : (isFr ? 'Dépense' : 'Expense')}
              </span>
            </td>
            <td className={`py-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{fmtTND(t.amount)}</td>
            <td className="py-2 text-right text-on-surface-variant dark:text-slate-400">{fmtDate(t.date)}</td>
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
          <th className="text-left pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Actif' : 'Asset'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Valeur' : 'Value'}</th>
          <th className="text-right pb-1.5 font-bold text-on-surface-variant dark:text-slate-400">{isFr ? 'Amort.' : 'Depr.'}</th>
        </tr>
      </thead>
      <tbody>
        {items.map(a => (
          <tr key={a._id} className="border-b border-outline-variant/10 dark:border-slate-700/50 last:border-0">
            <td className="py-2 pr-2 text-on-surface dark:text-slate-200 font-medium">{a.name}</td>
            <td className="py-2 text-right font-bold text-on-surface dark:text-slate-100">{fmtTND(a.value)}</td>
            <td className="py-2 text-right text-on-surface-variant dark:text-slate-400">{a.depreciationRate}%/an</td>
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
      <div style={{ overflow: 'hidden', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Priority config ─────────────────────────────────────────
const PRIORITY = {
  critical: { label: { fr: 'Critique', en: 'Critical' }, cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',       dot: 'bg-red-500',    border: 'border-red-200 dark:border-red-800/40'     },
  high:     { label: { fr: 'Élevé',    en: 'High'     }, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800/40' },
  medium:   { label: { fr: 'Moyen',    en: 'Medium'   }, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',  dot: 'bg-amber-400',  border: 'border-amber-200 dark:border-amber-800/40'  },
  low:      { label: { fr: 'Faible',   en: 'Low'      }, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',    dot: 'bg-slate-400',  border: 'border-slate-200 dark:border-slate-700'      },
};

const CAT_ICON = {
  invoices:     { icon: 'receipt_long',    color: 'text-blue-500'    },
  loans:        { icon: 'account_balance', color: 'text-violet-500'  },
  transactions: { icon: 'swap_horiz',      color: 'text-emerald-500' },
  assets:       { icon: 'inventory_2',     color: 'text-amber-500'   },
};

// ─── Expandable suggestion card ──────────────────────────────
function SuggestionCard({ s, category, isFr }) {
  const [open, setOpen]         = useState(false);
  const [entities, setEntities] = useState(null);
  const [loading, setLoading]   = useState(false);

  const actionL = isFr ? {
    invoices:     'Voir les factures',
    loans:        'Voir les prêts',
    transactions: 'Voir les transactions',
    assets:       'Voir les actifs',
  } : {
    invoices:     'View invoices',
    loans:        'View loans',
    transactions: 'View transactions',
    assets:       'View assets',
  };

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && entities === null) {
      const cfg = getEntityFetch(category, s.id);
      if (!cfg) return;
      setLoading(true);
      try {
        const { data } = await api.get(cfg.path);
        const arr = Array.isArray(data) ? data : (data.data || data.invoices || data.loans || data.transactions || data.assets || []);
        setEntities(cfg.filter(arr));
      } catch {
        setEntities([]);
      } finally {
        setLoading(false);
      }
    }
  }, [open, entities, category, s.id]);

  const p = PRIORITY[s.priority] || PRIORITY.low;

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-200
        ${open ? 'border-primary/40 dark:border-blue-500/40 shadow-lg' : `${p.border} hover:shadow-md`}
        bg-white dark:bg-slate-800/80`}
    >
      {/* ── Card header (always visible) ── */}
      <button
        className="w-full text-left p-4 flex items-start gap-3 group"
        onClick={toggle}
      >
        {/* priority dot */}
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${p.dot}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${p.cls}`}>
              {p.label[isFr ? 'fr' : 'en']}
            </span>
          </div>
          <p className="text-sm font-semibold text-on-surface dark:text-slate-100 leading-tight">{s.title}</p>
        </div>

        {/* optional metric pill */}
        {s.metric && (
          <div className="shrink-0 text-right">
            <div className="text-xs font-bold text-on-surface dark:text-slate-100">{s.metric.value}</div>
            <div className="text-[9px] text-on-surface-variant dark:text-slate-400">{s.metric.label}</div>
          </div>
        )}

        {/* expand chevron */}
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant dark:text-slate-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* ── Always-visible body ── */}
      <div className="px-4 pb-3 pl-9">
        <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed mb-2">{s.description}</p>

        {s.impact && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-[13px] text-primary">auto_awesome</span>
            <span className="text-[11px] text-primary dark:text-blue-400 font-medium italic">{s.impact}</span>
          </div>
        )}

        {/* action button — triggers expand */}
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-blue-400 hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]">
            {open ? 'keyboard_arrow_up' : 'arrow_forward'}
          </span>
          {open
            ? (isFr ? 'Réduire' : 'Collapse')
            : (s.actionLabel || actionL[category] || (isFr ? 'Voir les détails' : 'See details'))
          }
        </button>
      </div>

      {/* ── Expand panel ── */}
      <ExpandPanel open={open}>
        <div className="border-t border-outline-variant/20 dark:border-slate-700 mx-4 mt-1" />
        <div className="px-4 pt-3 pb-5 pl-9">
          {loading ? (
            <div className="flex items-center gap-2 py-5 justify-center">
              <span className="material-symbols-outlined text-[22px] text-primary animate-spin">progress_activity</span>
              <span className="text-xs text-on-surface-variant dark:text-slate-400">
                {isFr ? 'Chargement des données...' : 'Loading data...'}
              </span>
            </div>
          ) : entities !== null ? (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-[13px] text-emerald-500">circle</span>
                <p className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest">
                  {isFr ? 'Données en temps réel' : 'Live data'}
                  <span className="ml-2 normal-case font-normal text-on-surface-variant dark:text-slate-500">
                    · {entities.length} {isFr ? 'entrée(s)' : 'entries'}
                  </span>
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg">
                {category === 'invoices'     && <InvoiceRows     items={entities} isFr={isFr} />}
                {category === 'loans'        && <LoanRows        items={entities} isFr={isFr} />}
                {category === 'transactions' && <TransactionRows items={entities} isFr={isFr} />}
                {category === 'assets'       && <AssetRows       items={entities} isFr={isFr} />}
              </div>
            </div>
          ) : null}
        </div>
      </ExpandPanel>
    </div>
  );
}

// ─── Section block ───────────────────────────────────────────
function SectionBlock({ section, isFr }) {
  const catMeta = CAT_ICON[section.category] || { icon: 'lightbulb', color: 'text-primary' };
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-surface-container-lowest dark:bg-slate-800/50 rounded-2xl">
      {/* section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2.5 p-5 pb-4 rounded-t-2xl hover:bg-surface-container/50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <span className={`material-symbols-outlined text-[22px] ${catMeta.color}`}>{catMeta.icon}</span>
        <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 flex-1 text-left">{section.title}</h3>
        <span className="text-xs text-on-surface-variant dark:text-slate-500 mr-2">
          {section.suggestions?.length || 0} {isFr ? 'actions' : 'actions'}
        </span>
        <span className={`material-symbols-outlined text-[18px] text-on-surface-variant dark:text-slate-400 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
          expand_less
        </span>
      </button>

      <ExpandPanel open={!collapsed}>
        <div className="px-5 pb-5 flex flex-col gap-3">
          {(section.suggestions || []).map(s => (
            <SuggestionCard key={s.id} s={s} category={section.category} isFr={isFr} />
          ))}
        </div>
      </ExpandPanel>
    </div>
  );
}

// ─── Scenario catalogue ──────────────────────────────────────
const SCENARIOS = [
  { id: 'growth',               icon: 'rocket_launch',    gradient: 'from-emerald-500 to-teal-600',   ring: 'ring-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20',  badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300',  labelFr: 'Croissance Rapide',         labelEn: 'Rapid Growth',            tagFr: 'Expansion',    tagEn: 'Expansion',    descFr: 'Maximisez vos revenus, investissez intelligemment et développez votre portefeuille clients.',            descEn: 'Maximize revenue, invest smartly and grow your client portfolio.' },
  { id: 'stability',            icon: 'shield',           gradient: 'from-blue-500 to-indigo-600',    ring: 'ring-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300',              labelFr: 'Stabilisation',             labelEn: 'Stabilization',           tagFr: 'Équilibre',    tagEn: 'Balance',      descFr: 'Sécurisez votre trésorerie, réduisez le risque et maintenez un équilibre financier durable.',           descEn: 'Secure your cash flow, reduce risk and maintain a durable financial balance.' },
  { id: 'debt_reduction',       icon: 'savings',          gradient: 'from-violet-500 to-purple-600',  ring: 'ring-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/20',    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-800/40 dark:text-violet-300',     labelFr: 'Désendettement',            labelEn: 'Debt Reduction',          tagFr: 'Remboursement',tagEn: 'Repayment',    descFr: "Réduisez votre endettement méthodiquement et libérez votre capacité d'investissement.",                  descEn: 'Methodically reduce your debt and free up your investment capacity.' },
  { id: 'revenue_optimization', icon: 'trending_up',      gradient: 'from-amber-500 to-orange-500',   ring: 'ring-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300',         labelFr: 'Optimisation Revenus',      labelEn: 'Revenue Optimization',    tagFr: 'Rentabilité',  tagEn: 'Profitability',descFr: 'Optimisez vos flux de facturation, accélérez les encaissements et amplifiez vos meilleures sources.',   descEn: 'Optimize your billing flows, accelerate collections and amplify your best revenue sources.' },
  { id: 'recovery',             icon: 'emergency',        gradient: 'from-red-500 to-rose-600',       ring: 'ring-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',          badge: 'bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300',                 labelFr: 'Redressement',              labelEn: 'Emergency Recovery',      tagFr: 'Urgent',       tagEn: 'Urgent',       descFr: "Mode urgence : actions immédiates pour stabiliser la trésorerie et éviter la cessation de paiement.",   descEn: 'Emergency mode: immediate actions to stabilize cash flow and avoid payment default.' },
  { id: 'excellence',           icon: 'workspace_premium',gradient: 'from-slate-600 to-slate-800',    ring: 'ring-slate-400',   bg: 'bg-slate-50 dark:bg-slate-800/40',      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',            labelFr: 'Excellence Opérationnelle', labelEn: 'Operational Excellence',  tagFr: 'Équilibré',    tagEn: 'Balanced',     descFr: 'Optimisation équilibrée de toutes les dimensions financières pour une performance maximale.',            descEn: 'Balanced optimization of all financial dimensions for peak performance.' },
];

// ─── Scenario picker card ────────────────────────────────────
function ScenarioCard({ scenario, selected, onClick, isFr }) {
  const sc = SCENARIOS.find(s => s.id === scenario.id) || SCENARIOS[0];
  return (
    <button
      onClick={() => onClick(scenario.id)}
      className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
        ${selected
          ? `border-transparent ring-2 ${sc.ring} ${sc.bg} shadow-lg scale-[1.02]`
          : 'border-outline-variant/30 dark:border-slate-700 hover:border-outline-variant dark:hover:border-slate-600 hover:shadow-md hover:scale-[1.01] bg-surface-container-lowest dark:bg-slate-800'
        }`}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sc.gradient} flex items-center justify-center mb-3 shadow-sm`}>
        <span className="material-symbols-outlined text-white text-[20px]">{sc.icon}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${sc.badge}`}>
          {isFr ? sc.tagFr : sc.tagEn}
        </span>
        {selected && <span className="ml-auto material-symbols-outlined text-[16px] text-primary">check_circle</span>}
      </div>
      <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 mb-1">{isFr ? sc.labelFr : sc.labelEn}</h3>
      <p className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-snug">{isFr ? sc.descFr : sc.descEn}</p>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function Goals() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [result,           setResult]           = useState(null);
  const [loading,          setLoading]          = useState(false);
  const { addToast } = useToast();
  const { lang }    = useLang();
  const isFr        = lang === 'fr';

  const l = isFr ? {
    title:        'Stratégie',
    subtitle:     "Définissez votre cap et laissez l'IA analyser toute votre activité pour vous guider.",
    chooseTitle:  'Choisissez votre scénario',
    chooseHint:   "L'IA adapte ses recommandations à chaque dimension financière selon l'objectif sélectionné.",
    analyzeBtn:   "Analyser avec l'IA",
    analyzing:    'Analyse en cours...',
    changeScenario: 'Changer de scénario',
    currentScore: 'Score actuel',
    targetScore:  'Score cible',
    timeframe:    'Horizon',
    cashFlow:     'Flux de trésorerie',
    lateInv:      'Factures en retard',
    totalDebt:    'Endettement',
    expRatio:     'Ratio dépenses',
    activeScenario: 'Scénario actif :',
    totalSugg:    'recommandations',
    compareCTA:   'Analyser un autre scénario',
    compareHint:  'Comparez différents objectifs pour choisir la meilleure stratégie.',
  } : {
    title:        'Strategy',
    subtitle:     'Set your direction and let the AI analyse your entire activity to guide you.',
    chooseTitle:  'Choose your scenario',
    chooseHint:   'The AI adapts its recommendations to each financial dimension based on the selected goal.',
    analyzeBtn:   'Analyse with AI',
    analyzing:    'Analysing...',
    changeScenario: 'Change scenario',
    currentScore: 'Current score',
    targetScore:  'Target score',
    timeframe:    'Timeframe',
    cashFlow:     'Cash flow',
    lateInv:      'Late invoices',
    totalDebt:    'Total debt',
    expRatio:     'Expense ratio',
    activeScenario: 'Active scenario:',
    totalSugg:    'recommendations',
    compareCTA:   'Analyse another scenario',
    compareHint:  'Compare different goals to choose the best strategy.',
  };

  const analyse = useCallback(async (scenarioId) => {
    if (!scenarioId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.get(`/ai/goals/${scenarioId}?language=${lang}`);
      setResult(data);
    } catch {
      addToast('error', isFr ? 'Erreur' : 'Error', isFr ? 'Analyse impossible' : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [lang, isFr, addToast]);

  const handleScenarioClick = id => { setSelectedScenario(id); setResult(null); };

  const sc           = selectedScenario ? SCENARIOS.find(s => s.id === selectedScenario) : null;
  const totalSugg    = result ? result.sections.reduce((a, s) => a + (s.suggestions?.length || 0), 0) : 0;

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
          <p className="text-on-surface-variant dark:text-slate-400 mt-0.5 max-w-xl">{l.subtitle}</p>
        </div>
        {result && (
          <button
            onClick={() => { setResult(null); }}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {l.changeScenario}
          </button>
        )}
      </section>

      {/* ── Scenario picker ─────────────────────────────────── */}
      {!result && (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-on-surface dark:text-slate-100 mb-1">{l.chooseTitle}</h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">{l.chooseHint}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {SCENARIOS.map(scenario => (
              <ScenarioCard key={scenario.id} scenario={scenario} selected={selectedScenario === scenario.id} onClick={handleScenarioClick} isFr={isFr} />
            ))}
          </div>
          <div className="flex justify-center">
            <button
              disabled={!selectedScenario || loading}
              onClick={() => analyse(selectedScenario)}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition-all
                ${selectedScenario && !loading
                  ? `bg-gradient-to-r ${sc?.gradient || 'from-blue-500 to-indigo-600'} text-white hover:opacity-90 shadow-lg hover:shadow-xl hover:scale-105`
                  : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant dark:text-slate-400 cursor-not-allowed opacity-60'
                }`}
            >
              {loading
                ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>{l.analyzing}</>
                : <><span className="material-symbols-outlined text-[18px]">auto_awesome</span>{l.analyzeBtn}</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container-lowest dark:bg-slate-800 rounded-2xl p-6 animate-pulse">
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-5" />
              <div className="space-y-3">
                {[1, 2].map(j => <div key={j} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {result && sc && !loading && (
        <div className="space-y-5">

          {/* Hero banner */}
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${sc.gradient} p-6 text-white shadow-lg`}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-32 w-24 h-24 rounded-full bg-white/5 translate-y-8" />
            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">{sc.icon}</span>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/70 mb-0.5">{isFr ? sc.tagFr : sc.tagEn}</div>
                  <h3 className="text-xl font-extrabold font-headline">{isFr ? sc.labelFr : sc.labelEn}</h3>
                </div>
              </div>
              <div className="flex items-center gap-5 flex-wrap">
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">{l.currentScore}</div>
                  <div className="text-3xl font-extrabold font-headline">{result.currentMetrics?.score ?? '—'}</div>
                </div>
                <span className="material-symbols-outlined text-[22px] text-white/40">arrow_forward</span>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">{l.targetScore}</div>
                  <div className="text-3xl font-extrabold font-headline">{result.targetScore ?? '—'}</div>
                </div>
                <div className="text-center ml-2 border-l border-white/20 pl-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">{l.timeframe}</div>
                  <div className="text-sm font-bold">{result.timeframe ?? '—'}</div>
                </div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold ml-2">{totalSugg} {l.totalSugg}</div>
              </div>
            </div>
            {result.headline && (
              <div className="relative z-10 mt-5 pt-5 border-t border-white/20 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-white/60 mt-0.5 shrink-0">auto_stories</span>
                <p className="text-sm text-white/90 leading-relaxed">{result.headline}</p>
              </div>
            )}
          </div>

          {/* Scenario alignment warning */}
          {result.scenarioWarning?.show && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
              <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">warning</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  {isFr ? 'Scénario peu adapté à votre situation' : 'Scenario misaligned with your situation'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {isFr ? result.scenarioWarning.messageFr : result.scenarioWarning.messageEn}
                </p>
                {result.scenarioWarning.suggestedScenario && (
                  <button
                    onClick={() => {
                      const id = result.scenarioWarning.suggestedScenario;
                      setSelectedScenario(id);
                      setResult(null);
                      setTimeout(() => analyse(id), 50);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    {isFr
                      ? `Passer au scénario "${SCENARIOS.find(s => s.id === result.scenarioWarning.suggestedScenario)?.labelFr}"`
                      : `Switch to "${SCENARIOS.find(s => s.id === result.scenarioWarning.suggestedScenario)?.labelEn}" scenario`
                    }
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Metrics strip */}
          {result.currentMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: l.cashFlow,  value: fmtTND(result.currentMetrics.cashFlow),       icon: 'account_balance_wallet', good: result.currentMetrics.cashFlow >= 0 },
                { label: l.lateInv,   value: result.currentMetrics.lateInvoiceCount + (isFr ? ' facture(s)' : ' invoice(s)'), icon: 'warning', good: result.currentMetrics.lateInvoiceCount === 0 },
                { label: l.totalDebt, value: fmtTND(result.currentMetrics.totalDebt),      icon: 'account_balance',        good: result.currentMetrics.debtToAsset !== null && result.currentMetrics.debtToAsset < 0.5 },
                { label: l.expRatio,  value: fmtRatio(result.currentMetrics.expenseRatio !== null ? result.currentMetrics.expenseRatio * 100 : null, isFr), icon: 'pie_chart', good: result.currentMetrics.expenseRatio !== null && result.currentMetrics.expenseRatio < 0.7 },
              ].map(({ label, value, icon, good }) => (
                <div key={label} className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[20px] ${good ? 'text-emerald-500' : 'text-amber-500'}`}>{icon}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-on-surface-variant dark:text-slate-400 font-medium truncate">{label}</div>
                    <div className="text-sm font-bold text-on-surface dark:text-slate-100 truncate">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scenario switcher pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-on-surface-variant dark:text-slate-400 font-medium shrink-0">{l.activeScenario}</span>
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedScenario(s.id); setResult(null); setTimeout(() => analyse(s.id), 50); }}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                  s.id === selectedScenario
                    ? `bg-gradient-to-r ${s.gradient} text-white shadow-sm`
                    : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-high dark:hover:bg-slate-600'
                }`}
              >
                {isFr ? s.labelFr : s.labelEn}
              </button>
            ))}
          </div>

          {/* Suggestion sections — single column, full width, collapsible */}
          <div className="flex flex-col gap-4">
            {(result.sections || []).map(section => (
              <SectionBlock key={section.category} section={section} isFr={isFr} />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="flex items-center justify-between rounded-2xl bg-surface-container-lowest dark:bg-slate-800 p-5 flex-wrap gap-4">
            <div>
              <p className="text-sm font-bold text-on-surface dark:text-slate-100">{l.compareCTA}</p>
              <p className="text-xs text-on-surface-variant dark:text-slate-400">{l.compareHint}</p>
            </div>
            <button
              onClick={() => setResult(null)}
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
