import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useLang } from '../context/LanguageContext';

const fmt = (v, lang) =>
  new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }).format(
    v || 0
  );

// ── time-window helpers ──
const RANGES = [
  { key: 'month', fr: 'Ce mois', en: 'This month' },
  { key: '6m', fr: '6 derniers mois', en: 'Last 6 months' },
  { key: 'year', fr: 'Cette année', en: 'This year' },
];

function rangeStart(key) {
  const now = new Date();
  if (key === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (key === '6m') return new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return new Date(now.getFullYear(), 0, 1); // 'year'
}

const inRange = (d, start) => d && new Date(d) >= start;

// ── tiny UI atoms ──
const Section = ({ icon, color, title, children, action }) => (
  <div className="flex flex-col">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]" style={{ color }}>
          {icon}
        </span>
        <h4
          className="font-editorial text-[15px] font-bold text-[#0b1f33] dark:text-slate-100"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {title}
        </h4>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
      active
        ? 'bg-[#002b4c] text-white dark:bg-blue-500'
        : 'bg-[#f6f2ea] dark:bg-slate-700 text-[#6b7280] dark:text-slate-400 hover:bg-[#ebe4d2] dark:hover:bg-slate-600'
    }`}
  >
    {children}
  </button>
);

const Row = ({ idx, primary, secondary, value, valueColor, badge, badgeColor }) => (
  <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-[#f6f2ea] dark:hover:bg-slate-700/40 transition-colors cursor-default">
    <span className="text-[10px] font-mono w-4 text-[#9ca3af] tabular-nums">{idx}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-[#0b1f33] dark:text-slate-200 truncate">
          {primary}
        </span>
        {badge && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: badgeColor + '20', color: badgeColor }}
          >
            {badge}
          </span>
        )}
      </div>
      {secondary && (
        <div className="text-[11px] text-[#6b7280] dark:text-slate-400 truncate">{secondary}</div>
      )}
    </div>
    <div className="text-[13px] font-bold tabular-nums shrink-0" style={{ color: valueColor }}>
      {value}
    </div>
  </div>
);

const InsightLine = ({ icon, text }) => (
  <div className="mt-3 pt-3 border-t border-[#e8e0d0] dark:border-slate-700 flex items-start gap-2">
    <span className="material-symbols-outlined text-[14px] text-[#b8860b] mt-0.5">{icon}</span>
    <p className="text-[11px] italic text-[#4a5568] dark:text-slate-400 leading-snug">{text}</p>
  </div>
);

const Empty = ({ msg }) => (
  <div className="flex items-center justify-center py-6 text-[12px] text-[#9ca3af] italic">
    {msg}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────
export default function FinancialInsights() {
  const { lang } = useLang();
  const [range, setRange] = useState('year');
  const [txSort, setTxSort] = useState('profit'); // profit | amount | frequent
  const [invSort, setInvSort] = useState('value'); // value  | urgent
  const [loanSort, setLoanSort] = useState('amount'); // amount | interest | risk
  const [data, setData] = useState({ tx: [], inv: [], loans: [] });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tx, inv, ln] = await Promise.all([
        api.get('/transactions').catch(() => ({ data: [] })),
        api.get('/invoices').catch(() => ({ data: [] })),
        api.get('/loans').catch(() => ({ data: [] })),
      ]);
      setData({
        tx: Array.isArray(tx.data) ? tx.data : [],
        inv: Array.isArray(inv.data) ? inv.data : [],
        loans: Array.isArray(ln.data) ? ln.data : [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const start = useMemo(() => rangeStart(range), [range]);

  // ── Transactions ──
  const txInRange = useMemo(
    () => data.tx.filter((t) => inRange(t.date || t.createdAt, start)),
    [data.tx, start]
  );

  const topTransactions = useMemo(() => {
    if (txSort === 'amount') {
      return [...txInRange].sort((a, b) => b.amount - a.amount).slice(0, 5);
    }
    if (txSort === 'frequent') {
      // group by category, count occurrences, sum amount
      const map = new Map();
      for (const t of txInRange) {
        const k = t.category || '—';
        const cur = map.get(k) || { category: k, count: 0, total: 0, type: t.type };
        cur.count += 1;
        cur.total += t.amount || 0;
        map.set(k, cur);
      }
      return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    }
    // profit = income only, biggest revenue lines
    return [...txInRange]
      .filter((t) => t.type === 'income')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [txInRange, txSort]);

  // top revenue category for the insight line
  const topRevenueCategory = useMemo(() => {
    const map = new Map();
    for (const t of txInRange) {
      if (t.type !== 'income') continue;
      const k = t.category || '—';
      map.set(k, (map.get(k) || 0) + (t.amount || 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [txInRange]);

  // ── Invoices ──
  const invInRange = useMemo(
    () => data.inv.filter((i) => inRange(i.dueDate || i.createdAt, start) || i.status !== 'paid'),
    [data.inv, start]
  );

  const topInvoices = useMemo(() => {
    if (invSort === 'urgent') {
      const today = new Date();
      return [...invInRange]
        .filter((i) => i.status !== 'paid')
        .map((i) => ({
          ...i,
          daysOverdue: Math.floor((today - new Date(i.dueDate)) / 86400000),
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 5);
    }
    return [...invInRange].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [invInRange, invSort]);

  const mostCriticalInvoice = useMemo(() => {
    const today = new Date();
    const overdue = data.inv
      .filter((i) => i.status !== 'paid')
      .map((i) => ({ ...i, daysOverdue: Math.floor((today - new Date(i.dueDate)) / 86400000) }))
      .sort((a, b) => b.daysOverdue * b.amount - a.daysOverdue * a.amount);
    return overdue[0];
  }, [data.inv]);

  // ── Loans ──
  const loansInRange = useMemo(
    () => data.loans.filter((l) => inRange(l.createdAt, start) || l.workflowStatus !== 'rejected'),
    [data.loans, start]
  );

  const topLoans = useMemo(() => {
    const enriched = loansInRange.map((l) => {
      // simple risk heuristic: rate > 8 or amount/duration > 500 → high
      const monthlyBurden = l.amount / Math.max(l.duration || 1, 1);
      const riskScore = (l.interestRate || 0) * 1.2 + monthlyBurden / 200;
      const risk = riskScore > 18 ? 'high' : riskScore > 10 ? 'medium' : 'low';
      return { ...l, riskScore, risk };
    });
    if (loanSort === 'interest')
      return enriched.sort((a, b) => b.interestRate - a.interestRate).slice(0, 5);
    if (loanSort === 'risk') return enriched.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
    return enriched.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [loansInRange, loanSort]);

  const heaviestLoan = topLoans[0];

  // ── Card render ──
  return (
    <div className="editorial-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#e8e0d0] dark:border-slate-700 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#002b4c] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]">insights</span>
          </div>
          <div>
            <h3
              className="font-editorial text-[18px] font-black text-[#0b1f33] dark:text-slate-100"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {lang === 'fr' ? 'Insights Financiers' : 'Financial Insights'}
            </h3>
            <p className="small-caps text-[10px] text-[#6b7280] dark:text-slate-400">
              {lang === 'fr'
                ? 'Synthèse intelligente · Aide à la décision'
                : 'Intelligent summary · Decision support'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {RANGES.map((r) => (
            <Pill key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>
              {lang === 'fr' ? r.fr : r.en}
            </Pill>
          ))}
        </div>
      </div>

      {/* Body — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#e8e0d0] dark:divide-slate-700">
        {/* ── Transactions ── */}
        <div className="p-5">
          <Section
            icon="trending_up"
            color="#0d7a4a"
            title={lang === 'fr' ? 'Transactions' : 'Transactions'}
            action={
              <Link
                to="/transactions"
                className="text-[10px] font-bold text-[#002b4c] dark:text-blue-400 hover:underline"
              >
                {lang === 'fr' ? 'Voir →' : 'View →'}
              </Link>
            }
          >
            <div className="flex gap-1 mb-2 flex-wrap">
              <Pill active={txSort === 'profit'} onClick={() => setTxSort('profit')}>
                {lang === 'fr' ? 'Profit' : 'Profit'}
              </Pill>
              <Pill active={txSort === 'amount'} onClick={() => setTxSort('amount')}>
                {lang === 'fr' ? 'Montant' : 'Amount'}
              </Pill>
              <Pill active={txSort === 'frequent'} onClick={() => setTxSort('frequent')}>
                {lang === 'fr' ? 'Fréquence' : 'Frequent'}
              </Pill>
            </div>
            {loading ? (
              <Empty msg={lang === 'fr' ? 'Chargement…' : 'Loading…'} />
            ) : topTransactions.length === 0 ? (
              <Empty msg={lang === 'fr' ? 'Aucune transaction' : 'No transactions'} />
            ) : (
              <div className="space-y-0.5">
                {topTransactions.map((t, i) => {
                  if (txSort === 'frequent') {
                    return (
                      <Row
                        key={i}
                        idx={i + 1}
                        primary={t.category}
                        secondary={`${t.count} ${lang === 'fr' ? 'opérations' : 'entries'}`}
                        value={fmt(t.total, lang) + ' TND'}
                        valueColor={t.type === 'expense' ? '#c8102e' : '#0d7a4a'}
                      />
                    );
                  }
                  return (
                    <Row
                      key={t._id || i}
                      idx={i + 1}
                      primary={t.category || '—'}
                      secondary={
                        t.description ||
                        (t.type === 'income'
                          ? lang === 'fr'
                            ? 'Revenu'
                            : 'Income'
                          : lang === 'fr'
                            ? 'Dépense'
                            : 'Expense')
                      }
                      value={(t.type === 'expense' ? '-' : '+') + fmt(t.amount, lang) + ' TND'}
                      valueColor={t.type === 'expense' ? '#c8102e' : '#0d7a4a'}
                    />
                  );
                })}
              </div>
            )}
            {topRevenueCategory && (
              <InsightLine
                icon="lightbulb"
                text={
                  lang === 'fr'
                    ? `Source de revenu n°1 : ${topRevenueCategory[0]} (${fmt(topRevenueCategory[1], lang)} TND)`
                    : `Top revenue source: ${topRevenueCategory[0]} (${fmt(topRevenueCategory[1], lang)} TND)`
                }
              />
            )}
          </Section>
        </div>

        {/* ── Invoices ── */}
        <div className="p-5">
          <Section
            icon="receipt_long"
            color="#b8860b"
            title={lang === 'fr' ? 'Factures' : 'Invoices'}
            action={
              <Link
                to="/invoices"
                className="text-[10px] font-bold text-[#002b4c] dark:text-blue-400 hover:underline"
              >
                {lang === 'fr' ? 'Voir →' : 'View →'}
              </Link>
            }
          >
            <div className="flex gap-1 mb-2 flex-wrap">
              <Pill active={invSort === 'value'} onClick={() => setInvSort('value')}>
                {lang === 'fr' ? 'Valeur' : 'Value'}
              </Pill>
              <Pill active={invSort === 'urgent'} onClick={() => setInvSort('urgent')}>
                {lang === 'fr' ? 'Urgent' : 'Urgent'}
              </Pill>
            </div>
            {loading ? (
              <Empty msg={lang === 'fr' ? 'Chargement…' : 'Loading…'} />
            ) : topInvoices.length === 0 ? (
              <Empty msg={lang === 'fr' ? 'Aucune facture' : 'No invoices'} />
            ) : (
              <div className="space-y-0.5">
                {topInvoices.map((iv, i) => {
                  const overdue = iv.daysOverdue > 0;
                  const badge =
                    iv.status === 'paid'
                      ? { txt: lang === 'fr' ? 'Payée' : 'Paid', clr: '#0d7a4a' }
                      : overdue
                        ? {
                            txt: lang === 'fr' ? `+${iv.daysOverdue}j` : `+${iv.daysOverdue}d`,
                            clr: '#c8102e',
                          }
                        : { txt: lang === 'fr' ? 'Due' : 'Due', clr: '#b8860b' };
                  return (
                    <Row
                      key={iv._id || i}
                      idx={i + 1}
                      primary={iv.clientName || '—'}
                      secondary={
                        iv.dueDate
                          ? `${lang === 'fr' ? 'Échéance' : 'Due'} ${new Date(iv.dueDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')}`
                          : ''
                      }
                      value={fmt(iv.amount, lang) + ' TND'}
                      valueColor={overdue ? '#c8102e' : '#0b1f33'}
                      badge={badge.txt}
                      badgeColor={badge.clr}
                    />
                  );
                })}
              </div>
            )}
            {mostCriticalInvoice && mostCriticalInvoice.daysOverdue > 0 && (
              <InsightLine
                icon="warning"
                text={
                  lang === 'fr'
                    ? `Facture critique : ${mostCriticalInvoice.clientName} — en retard de ${mostCriticalInvoice.daysOverdue} jours`
                    : `Most critical invoice: ${mostCriticalInvoice.clientName} — overdue by ${mostCriticalInvoice.daysOverdue} days`
                }
              />
            )}
          </Section>
        </div>

        {/* ── Loans ── */}
        <div className="p-5">
          <Section
            icon="account_balance"
            color="#7c3aed"
            title={lang === 'fr' ? 'Prêts' : 'Loans'}
            action={
              <Link
                to="/loans"
                className="text-[10px] font-bold text-[#002b4c] dark:text-blue-400 hover:underline"
              >
                {lang === 'fr' ? 'Voir →' : 'View →'}
              </Link>
            }
          >
            <div className="flex gap-1 mb-2 flex-wrap">
              <Pill active={loanSort === 'amount'} onClick={() => setLoanSort('amount')}>
                {lang === 'fr' ? 'Montant' : 'Amount'}
              </Pill>
              <Pill active={loanSort === 'interest'} onClick={() => setLoanSort('interest')}>
                {lang === 'fr' ? 'Taux' : 'Rate'}
              </Pill>
              <Pill active={loanSort === 'risk'} onClick={() => setLoanSort('risk')}>
                {lang === 'fr' ? 'Risque' : 'Risk'}
              </Pill>
            </div>
            {loading ? (
              <Empty msg={lang === 'fr' ? 'Chargement…' : 'Loading…'} />
            ) : topLoans.length === 0 ? (
              <Empty msg={lang === 'fr' ? 'Aucun prêt' : 'No loans'} />
            ) : (
              <div className="space-y-0.5">
                {topLoans.map((l, i) => {
                  const riskClr =
                    l.risk === 'high' ? '#c8102e' : l.risk === 'medium' ? '#b8860b' : '#0d7a4a';
                  const riskTxt =
                    l.risk === 'high'
                      ? lang === 'fr'
                        ? 'Élevé'
                        : 'High'
                      : l.risk === 'medium'
                        ? lang === 'fr'
                          ? 'Moyen'
                          : 'Med'
                        : lang === 'fr'
                          ? 'Faible'
                          : 'Low';
                  return (
                    <Row
                      key={l._id || i}
                      idx={i + 1}
                      primary={fmt(l.amount, lang) + ' TND'}
                      secondary={`${l.interestRate}% · ${l.duration} ${lang === 'fr' ? 'mois' : 'mo'} · ${fmt(l.monthlyPayment, lang)}/m`}
                      value={`${l.interestRate}%`}
                      valueColor={l.interestRate > 8 ? '#c8102e' : '#0b1f33'}
                      badge={riskTxt}
                      badgeColor={riskClr}
                    />
                  );
                })}
              </div>
            )}
            {heaviestLoan && (
              <InsightLine
                icon="priority_high"
                text={
                  lang === 'fr'
                    ? `Prêt le plus impactant : ${fmt(heaviestLoan.amount, lang)} TND à ${heaviestLoan.interestRate}% — risque ${heaviestLoan.risk === 'high' ? 'élevé' : heaviestLoan.risk === 'medium' ? 'moyen' : 'faible'}`
                    : `Most impactful loan: ${fmt(heaviestLoan.amount, lang)} TND at ${heaviestLoan.interestRate}% — ${heaviestLoan.risk} risk`
                }
              />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
