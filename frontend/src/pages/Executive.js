/**
 * Executive.js — Fiscal Calendar
 * Editorial layout inspired by Sentinel Executive "Fiscal Calendar":
 *   - Top sub-navigation
 *   - Main calendar grid (month view) with fiscal deadline chips
 *   - Left rail: Risk Intelligence quick filters
 *   - Right rail: upcoming deadlines + focus-date card
 *   - AI Sentinel insight banner
 *
 * Events are aggregated client-side from real data:
 *   • Invoice due dates                (API /invoices)
 *   • Loan repayment dates (1st of month + synthesized interest days)
 *   • Synthetic fiscal deadlines       (TVA quarterly, payroll, social charges)
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { SkeletonKPIGrid } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

// ─── Event taxonomy ────────────────────────────────────────────────────────
const EVENT_STYLES = {
  tva:         { labelFr: 'TVA',              labelEn: 'VAT',             bg: '#fbe9ec', fg: '#c8102e', dot: '#c8102e' },
  payroll:     { labelFr: 'Paie',             labelEn: 'Payroll',         bg: '#eef3f8', fg: '#002b4c', dot: '#002b4c' },
  social:      { labelFr: 'Charges sociales', labelEn: 'Social charges',  bg: '#fff4e5', fg: '#c46320', dot: '#c46320' },
  invoice:     { labelFr: 'Facture',          labelEn: 'Invoice',         bg: '#eef3f8', fg: '#002b4c', dot: '#002b4c' },
  loan:        { labelFr: 'Prêt',             labelEn: 'Loan',            bg: '#ede9fe', fg: '#5b21b6', dot: '#5b21b6' },
  corporatetax:{ labelFr: 'Impôt société',    labelEn: 'Corporate tax',   bg: '#fbe9ec', fg: '#c8102e', dot: '#c8102e' },
};

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_EN = ['January', 'February', 'March',  'April', 'May', 'June', 'July',    'August', 'September', 'October',  'November', 'December'];
const DAYS_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const DAYS_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Fiscal deadlines for the visible month.
// - Payroll date + amount are DRIVEN BY the company's own transaction history
//   (`payrollPattern` derived from `/api/transactions`).
// - Everything else uses Tunisian tax law (CNSS, TVA, IS).
function buildFiscalEvents(year, month /* 0-11 */, lang, monthlyExpenses = 0, payrollPattern = null) {
  const events = [];
  const L = lang === 'fr';

  // ── Payroll (DATA-DRIVEN) ──────────────────────────────────────────────
  // If we found payroll transactions, use the observed day + average amount.
  // Otherwise fall back to a sensible proxy (55 % of monthly OpEx, 28th).
  const payrollDay     = payrollPattern?.day    ?? 28;
  const payrollAmount  = payrollPattern?.amount ?? Math.max(8000, Math.round((monthlyExpenses || 35000) * 0.55));
  const payrollSource  = payrollPattern
    ? (L ? `basé sur ${payrollPattern.sampleSize} paie(s) historique(s)` : `based on ${payrollPattern.sampleSize} historical payroll run(s)`)
    : (L ? 'estimation par défaut' : 'default estimate');

  events.push({
    date: new Date(year, month, payrollDay),
    kind: 'payroll',
    title:  L ? 'Versement des salaires' : 'Monthly payroll',
    amount: payrollAmount, currency: 'TND',
    severity: payrollAmount > 30000 ? 'urgent' : 'normal',
    description: L
      ? `Masse salariale : ${payrollAmount.toLocaleString('fr-FR')} TND — ${payrollSource}`
      : `Payroll mass: ${payrollAmount.toLocaleString('en-GB')} TND — ${payrollSource}`,
  });

  // ── CNSS (TN LAW) ──────────────────────────────────────────────────────
  // Declaration + payment due the 15th of the month following the quarter.
  // In practice Tunisian SMEs pay CNSS monthly around the 15th based on the
  // previous month's gross payroll. Rate = 25.75 % employer + employee share.
  const cnssAmount = Math.round(payrollAmount * 0.2575);
  events.push({
    date: new Date(year, month, 15),
    kind: 'social',
    title:  L ? 'Cotisations CNSS' : 'CNSS contributions',
    amount: cnssAmount, currency: 'TND',
    severity: 'normal',
    description: L
      ? `Base légale : 25,75 % de la masse salariale (${cnssAmount.toLocaleString('fr-FR')} TND)`
      : `Statutory rate: 25.75 % of payroll mass (${cnssAmount.toLocaleString('en-GB')} TND)`,
  });

  // ── TVA (TN LAW) ───────────────────────────────────────────────────────
  // Monthly declaration due by the 28th for persons morales (sociétés).
  // Rate standard = 19 %. We use 15 % of monthly turnover as a realistic
  // proxy for net VAT payable after input-tax deductions.
  const tvaAmount = Math.max(3000, Math.round((monthlyExpenses || 40000) * 0.19 * 0.75));
  events.push({
    date: new Date(year, month, 28),
    kind: 'tva',
    title:  L ? 'Déclaration TVA mensuelle' : 'Monthly VAT return',
    amount: tvaAmount, currency: 'TND',
    severity: 'urgent',
    description: L
      ? `TVA nette due (taux 19 %, net ~15 %) : ${tvaAmount.toLocaleString('fr-FR')} TND`
      : `Net VAT payable (19 % rate, net ~15 %): ${tvaAmount.toLocaleString('en-GB')} TND`,
  });

  // ── IS / Acomptes provisionnels (TN LAW) ───────────────────────────────
  // Three provisional instalments of 30 % of the prior year's IS liability,
  // due 25th of the 6th/9th/12th month. Simplified: 25 June / 25 September
  // / 25 December. Plus annual balance 25 March.
  const corpTaxAmount = Math.max(15000, Math.round((monthlyExpenses || 40000) * 1.2));
  if (month === 2) { // March: annual balance
    events.push({
      date: new Date(year, 2, 25),
      kind: 'corporatetax',
      title:  L ? 'IS — Solde annuel' : 'Corporate tax — annual balance',
      amount: corpTaxAmount, currency: 'TND',
      severity: 'urgent',
      description: L
        ? `Paiement annuel de l\'impôt sur les sociétés (taux 15 %)` : `Annual corporate tax payment (15 % rate)`,
    });
  }
  if ([5, 8, 11].includes(month)) { // June, September, December: provisional instalments
    const acompte = Math.round(corpTaxAmount * 0.3);
    const labelFr = month === 5 ? '1er acompte' : month === 8 ? '2e acompte' : '3e acompte';
    const labelEn = month === 5 ? '1st instalment' : month === 8 ? '2nd instalment' : '3rd instalment';
    events.push({
      date: new Date(year, month, 25),
      kind: 'corporatetax',
      title:  L ? `IS — ${labelFr} provisionnel` : `Corporate tax — ${labelEn} (provisional)`,
      amount: acompte, currency: 'TND',
      severity: 'normal',
      description: L
        ? `30 % de l\'IS de l\'exercice précédent` : `30 % of the prior-year IS liability`,
    });
  }

  return events;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function Executive() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [invoices, setInvoices] = useState([]);
  const [loans, setLoans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [risk, setRisk] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const [inv, loan, tx, r, h] = await Promise.all([
        api.get('/invoices').catch(() => ({ data: [] })),
        api.get('/loans').catch(() => ({ data: [] })),
        api.get('/transactions').catch(() => ({ data: [] })),
        api.get('/ai/risk-report').catch(() => ({ data: null })),
        api.get('/ai/health-index').catch(() => ({ data: null })),
      ]);
      setInvoices(inv.data || []);
      setLoans(loan.data || []);
      setTransactions(tx.data || []);
      setRisk(r.data);
      setHealth(h.data);
    } catch {
      addToast('error', 'Error', 'Load failed');
    } finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const monthlyExpenses = risk?.trends?.expenses?.current || 0;

  // ─── Payroll pattern inferred from real transactions ────────────────────
  // Find expense transactions whose category/description hints at payroll,
  // then derive the most representative day-of-month AND average amount.
  const payrollPattern = useMemo(() => {
    const PAYROLL_HINT = /\b(salar|payroll|paie|paye|wage|employ)/i;
    const hits = (transactions || [])
      .filter((t) => t.type === 'expense'
        && (PAYROLL_HINT.test(t.category || '') || PAYROLL_HINT.test(t.description || '')))
      .map((t) => ({ date: new Date(t.date), amount: t.amount }))
      .filter((t) => !isNaN(t.date.getTime()))
      .sort((a, b) => b.date - a.date); // newest first

    if (hits.length === 0) return null;

    // Most representative day = most-recent payroll's day-of-month
    // (business owners typically stick to a fixed day)
    const day = hits[0].date.getDate();

    // Average of the 6 most recent payroll runs
    const recent = hits.slice(0, 6);
    const avgAmount = Math.round(recent.reduce((s, x) => s + (x.amount || 0), 0) / recent.length);

    return {
      day: Math.min(Math.max(day, 1), 28), // clamp 1..28 (safe for every month)
      amount: avgAmount,
      sampleSize: hits.length,
      lastRun: hits[0].date,
    };
  }, [transactions]);

  const events = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const L = lang === 'fr';

    const list = [...buildFiscalEvents(y, m, lang, monthlyExpenses, payrollPattern)];

    // Invoices due this month
    invoices.forEach((inv) => {
      const d = new Date(inv.dueDate);
      if (d.getFullYear() === y && d.getMonth() === m) {
        list.push({
          date: d,
          kind: 'invoice',
          title:  L ? `Facture ${inv.clientName}` : `Invoice ${inv.clientName}`,
          amount: inv.amount, currency: 'TND',
          severity: inv.status === 'late' ? 'urgent' : 'normal',
          description: L
            ? `Statut : ${inv.status}`
            : `Status: ${inv.status}`,
          entityId: inv._id,
        });
      }
    });

    // Loan repayments — synthetize a monthly payment on the 5th
    loans.forEach((ln, i) => {
      list.push({
        date: new Date(y, m, 5 + (i % 3)),
        kind: 'loan',
        title:  L ? `Échéance prêt ${ln.amount?.toLocaleString('fr-FR')} TND` : `Loan payment ${ln.amount?.toLocaleString('en-GB')} TND`,
        amount: ln.monthlyPayment || Math.round((ln.amount || 0) / (ln.duration || 12)),
        currency: 'TND',
        severity: 'normal',
        description: L ? `Taux ${ln.interestRate}% · durée ${ln.duration} mois` : `${ln.interestRate}% rate · ${ln.duration} months`,
      });
    });

    return list.sort((a, b) => a.date - b.date);
  }, [cursor, invoices, loans, lang, monthlyExpenses]);

  // Events grouped by ISO-day (YYYY-MM-DD)
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const k = e.date.toISOString().slice(0, 10);
      (map[k] ||= []).push(e);
    });
    return map;
  }, [events]);

  // Upcoming events (next 5 from today forward)
  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events.filter((e) => e.date.getTime() >= startOfToday.getTime()).slice(0, 5);
  }, [events]);

  // Peak-outflow day for the AI insight: day within the visible month whose
  // cumulative event amount is the highest AND that is not already past.
  const peakDay = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const byDay = {};
    events.forEach((e) => {
      if (e.date.getTime() < startOfToday.getTime()) return;
      const k = e.date.toISOString().slice(0, 10);
      byDay[k] ||= { date: e.date, total: 0, count: 0, urgent: false };
      byDay[k].total += typeof e.amount === 'number' ? e.amount : 0;
      byDay[k].count += 1;
      if (e.severity === 'urgent') byDay[k].urgent = true;
    });
    const rows = Object.values(byDay).sort((a, b) => b.total - a.total);
    return rows[0] || null;
  }, [events]);

  // Events on selected day
  const selectedKey = selected.toISOString().slice(0, 10);
  const selectedEvents = eventsByDay[selectedKey] || [];

  // Build the grid (6 weeks × 7 days)
  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDay = new Date(y, m, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
    const start = new Date(y, m, 1 - startWeekday);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const monthName = (lang === 'fr' ? MONTHS_FR : MONTHS_EN)[cursor.getMonth()];
  const dayLabels = lang === 'fr' ? DAYS_FR : DAYS_EN;

  const prevMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const nextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday   = () => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(new Date(t.getFullYear(), t.getMonth(), t.getDate())); };

  if (loading) return (
    <div>
      <SkeletonKPIGrid count={3} />
    </div>
  );

  // Focus card metrics — driven by BOTH event count/severity AND monetary weight
  const focusImpact = selectedEvents.reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : 0), 0);
  const monthlyIncome = risk?.trends?.income?.current || 0;
  const focusTreasuryDelta = focusImpact > 0 && monthlyIncome > 0
    ? -((focusImpact / monthlyIncome) * 100)
    : null;

  const focusRiskLevel = (() => {
    if (selectedEvents.length === 0) return 'none';
    // Critical: urgent event with a serious monetary weight (> 10% of monthly income)
    const pctOfIncome = monthlyIncome > 0 ? (focusImpact / monthlyIncome) * 100 : 0;
    const anyUrgent = selectedEvents.some((e) => e.severity === 'urgent');
    if (anyUrgent && pctOfIncome > 10) return 'critical';
    if (anyUrgent) return 'high';
    if (pctOfIncome > 10) return 'high';
    if (pctOfIncome > 4 || selectedEvents.length > 1) return 'moderate';
    return 'low';
  })();

  return (
    <div>
      {/* Main layout: calendar | right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── CALENDAR ─── */}
        <main className="lg:col-span-9">
          {/* Month nav + Today + Generate */}
          <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="font-editorial text-[40px] font-black leading-none text-[#0b1f33]"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                {monthName} {cursor.getFullYear()}
              </h2>
              <div className="small-caps mt-2" style={{ color: '#8b8672' }}>
                {lang === 'fr' ? 'Calendrier des échéances fiscales' : 'Fiscal deadlines calendar'}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={prevMonth}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[#efe8dc]"
                      style={{ background: '#ffffff', border: '1px solid #e5ddce' }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#002b4c' }}>chevron_left</span>
              </button>
              <button onClick={goToday}
                      className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors hover:bg-[#efe8dc]"
                      style={{ background: '#ffffff', border: '1px solid #e5ddce', color: '#002b4c' }}>
                {lang === 'fr' ? 'Aujourd\'hui' : 'Today'}
              </button>
              <button onClick={nextMonth}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[#efe8dc]"
                      style={{ background: '#ffffff', border: '1px solid #e5ddce' }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#002b4c' }}>chevron_right</span>
              </button>
              <div className="w-px h-7 mx-1" style={{ background: '#e5ddce' }} />
              <Link to="/reports"
                    className="editorial-btn-primary text-[12px] inline-flex items-center gap-2 !py-2 !px-4">
                <span className="material-symbols-outlined text-[16px]">description</span>
                {lang === 'fr' ? 'Générer rapport' : 'Generate Report'}
              </Link>
            </div>
          </div>

          {/* Event-type filter chips — replaces the removed left rail */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="small-caps text-[#8b8672] mr-2 self-center">
              {lang === 'fr' ? 'Filtrer' : 'Filter'}
            </span>
            {[
              ['tva',          lang === 'fr' ? 'TVA'             : 'VAT'],
              ['payroll',      lang === 'fr' ? 'Paie'            : 'Payroll'],
              ['social',       lang === 'fr' ? 'Charges sociales' : 'Social charges'],
              ['invoice',      lang === 'fr' ? 'Factures'        : 'Invoices'],
              ['loan',         lang === 'fr' ? 'Prêts'           : 'Loans'],
              ['corporatetax', lang === 'fr' ? 'Impôt société'   : 'Corporate tax'],
            ].map(([key, label]) => {
              const st = EVENT_STYLES[key];
              return (
                <div key={key}
                     className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                     style={{ background: st.bg, color: st.fg }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }}></span>
                  {label}
                </div>
              );
            })}
          </div>

          {/* Sentinel AI insight — driven by the real peak-outflow day */}
          <div className="mb-4 editorial-card p-4 flex items-start gap-3"
               style={{ background: '#eef3f8', borderColor: '#c9d8e8', borderLeft: '4px solid #002b4c' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: '#002b4c' }}>
              <span className="material-symbols-outlined text-[18px] text-white">auto_awesome</span>
            </div>
            <div className="min-w-0">
              <div className="small-caps text-[#002b4c]">
                {lang === 'fr' ? 'Insight Sentinel AI' : 'Sentinel AI Insight'}
              </div>
              <p className="text-[13px] text-[#0b1f33] mt-0.5 leading-relaxed">
                {peakDay && peakDay.total > 0
                  ? (lang === 'fr'
                      ? <>L'IA prévoit un pic de sorties de fonds le <strong>{peakDay.date.getDate()} {monthName.toLowerCase()}</strong>
                           {' '} — cumul estimé de <strong>{peakDay.total.toLocaleString('fr-FR')} TND</strong>
                           {' '}sur {peakDay.count} échéance{peakDay.count > 1 ? 's' : ''}.
                           {' '}Prévoyez une réserve de trésorerie adéquate.</>
                      : <>AI forecasts a cash-outflow peak on <strong>{peakDay.date.getDate()} {monthName}</strong>
                           {' '}— estimated total <strong>{peakDay.total.toLocaleString('en-GB')} TND</strong>
                           {' '}across {peakDay.count} deadline{peakDay.count > 1 ? 's' : ''}.
                           {' '}Ensure adequate treasury reserve.</>)
                  : (lang === 'fr' ? 'Aucune échéance critique ce mois-ci.' : 'No critical deadlines this month.')}
              </p>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="editorial-card p-4">
            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayLabels.map((d) => (
                <div key={d} className="small-caps text-center py-2" style={{ color: '#8b8672' }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = d.toDateString() === today.toDateString();
                const isSelected = d.toDateString() === selected.toDateString();
                const dayKey = d.toISOString().slice(0, 10);
                const dayEvents = eventsByDay[dayKey] || [];
                const urgent = dayEvents.some((e) => e.severity === 'urgent');
                return (
                  <button key={i} onClick={() => setSelected(new Date(d))}
                          className={`group min-h-[84px] p-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'ring-2 ring-offset-1'
                              : 'hover:bg-[#faf7f2]'
                          }`}
                          style={{
                            background: isSelected ? '#fef8f9' : (inMonth ? '#ffffff' : '#fbf7ef'),
                            border:     isSelected ? '1px solid transparent' : '1px solid #efe8dc',
                            '--tw-ring-color': urgent ? '#c8102e' : '#002b4c',
                            opacity:    inMonth ? 1 : 0.45,
                          }}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[13px] font-semibold ${isToday ? 'text-white' : ''}`}>
                        {isToday ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                                style={{ background: '#002b4c' }}>
                            <span className="text-white text-[11px] font-bold">{d.getDate()}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#0b1f33' }}>{d.getDate()}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((e, j) => {
                        const st = EVENT_STYLES[e.kind];
                        return (
                          <div key={j} className="px-1.5 py-0.5 rounded text-[9px] font-semibold truncate flex items-center gap-1"
                               style={{ background: st.bg, color: st.fg }}>
                            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: st.dot }}></span>
                            {e.severity === 'urgent' && (
                              <span className="small-caps" style={{ fontSize: 7, letterSpacing: '0.08em' }}>URG</span>
                            )}
                            <span className="truncate">{lang === 'fr' ? st.labelFr : st.labelEn}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-[#6b7280] italic">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* ─── RIGHT RAIL ─── */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="font-editorial text-[20px] font-bold text-[#0b1f33]"
               style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {lang === 'fr' ? 'Échéances Prochaines' : 'Upcoming Deadlines'}
          </div>

          {upcoming.length === 0 && (
            <div className="editorial-card p-5 text-center text-[12px] text-[#6b7280] italic">
              {lang === 'fr' ? 'Aucune échéance à venir.' : 'No upcoming deadlines.'}
            </div>
          )}

          {upcoming.slice(0, 2).map((e, i) => {
            const st = EVENT_STYLES[e.kind];
            const isUrgent = e.severity === 'urgent';
            return (
              <div key={i} className="editorial-card p-4 relative overflow-hidden"
                   style={{ borderLeft: `3px solid ${isUrgent ? '#c8102e' : '#d8cfb9'}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="small-caps" style={{ color: isUrgent ? '#c8102e' : '#8b8672' }}>
                    {isUrgent
                      ? (lang === 'fr' ? 'Urgent' : 'Urgent')
                      : (lang === 'fr' ? 'À venir' : 'Upcoming')}
                    {' · '}{e.date.getDate()} {(lang === 'fr' ? MONTHS_FR : MONTHS_EN)[e.date.getMonth()].slice(0, 3)}
                  </span>
                  {e.amount !== null && (
                    <span className="text-[13px] font-bold text-[#0b1f33]">
                      {e.amount.toLocaleString('fr-FR')} TND
                    </span>
                  )}
                </div>
                <div className="font-editorial text-[15px] font-bold text-[#0b1f33] leading-snug"
                     style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  {e.title}
                </div>
                <p className="text-[11px] text-[#6b7280] mt-1">{e.description}</p>
              </div>
            );
          })}

          {/* Focus card */}
          <div className="editorial-card p-5"
               style={{ background: '#eef3f8', borderColor: '#c9d8e8' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px]" style={{ color: '#002b4c' }}>center_focus_strong</span>
              <div className="small-caps text-[#002b4c]">
                {lang === 'fr' ? 'Focus' : 'Focus'}
                {' : '}
                {selected.getDate()} {(lang === 'fr' ? MONTHS_FR : MONTHS_EN)[selected.getMonth()]}
              </div>
            </div>

            {focusRiskLevel === 'none' ? (
              <div className="py-2 text-[12px] text-[#6b7280] italic">
                {lang === 'fr' ? 'Aucune échéance ce jour.' : 'No deadline today.'}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-[12px] py-2 border-b"
                     style={{ borderColor: '#c9d8e8' }}>
                  <span className="text-[#6b7280]">{lang === 'fr' ? 'Niveau de Risque' : 'Risk Level'}</span>
                  <span className="editorial-pill-critical"
                        style={{
                          background: focusRiskLevel === 'critical' ? '#fbe9ec' : focusRiskLevel === 'high' ? '#fff4e5' : focusRiskLevel === 'moderate' ? '#fff9e0' : '#e8f5e9',
                          color:      focusRiskLevel === 'critical' ? '#c8102e' : focusRiskLevel === 'high' ? '#c46320' : focusRiskLevel === 'moderate' ? '#a47700' : '#0d7a4a',
                        }}>
                    {focusRiskLevel === 'critical' ? (lang === 'fr' ? 'Critique' : 'Critical') :
                     focusRiskLevel === 'high'     ? (lang === 'fr' ? 'Élevé'    : 'High')     :
                     focusRiskLevel === 'moderate' ? (lang === 'fr' ? 'Modéré'   : 'Moderate') :
                                                      (lang === 'fr' ? 'Faible'   : 'Low')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[12px] py-2.5">
                  <span className="text-[#6b7280]">{lang === 'fr' ? 'Impact Trésorerie' : 'Treasury Impact'}</span>
                  <span className="font-bold text-[#0b1f33]">
                    {focusImpact > 0
                      ? <span style={{ color: focusRiskLevel === 'critical' || focusRiskLevel === 'high' ? '#c8102e' : '#a47700' }}>
                          -{focusImpact.toLocaleString('fr-FR')} TND
                          {focusTreasuryDelta !== null && <span className="text-[10px] ml-1 opacity-75">
                            ({focusTreasuryDelta.toFixed(1)}%)
                          </span>}
                        </span>
                      : <span style={{ color: '#0d7a4a' }}>—</span>}
                  </span>
                </div>

                <p className="text-[11px] italic text-[#6b7280] leading-relaxed mt-2 pt-2 border-t"
                   style={{ borderColor: '#c9d8e8' }}>
                  {lang === 'fr'
                    ? `La conformité fiscale est à ${health?.score || 88}%. Le paiement de cette échéance portera le score à ${Math.min(100, (health?.score || 88) + 6)}%.`
                    : `Fiscal compliance at ${health?.score || 88}%. Paying this deadline will raise the score to ${Math.min(100, (health?.score || 88) + 6)}%.`}
                </p>
              </>
            )}
          </div>

          {/* Selected day events list */}
          {selectedEvents.length > 0 && (
            <div className="editorial-card p-4">
              <div className="small-caps text-[#6b7280] mb-2">
                {lang === 'fr' ? 'Événements du jour' : "Day's events"}
              </div>
              <ul className="space-y-2">
                {selectedEvents.map((e, i) => {
                  const st = EVENT_STYLES[e.kind];
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: st.dot }}></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-[#0b1f33] truncate">{e.title}</p>
                        {e.amount && <p className="text-[10px] text-[#6b7280]">{e.amount.toLocaleString('fr-FR')} TND</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <div className="editorial-divider my-8" />
      <div className="flex items-center justify-between flex-wrap gap-3 pb-6">
        <span className="editorial-confidential-footer">
          EXECUTIVE RISK EDITORIAL · INTELLIGENCE ARTIFICIELLE V4.2
        </span>
        <span className="editorial-confidential-footer">
          {lang === 'fr' ? 'DOCUMENT DE TRAVAIL · CONFIDENTIEL' : 'WORKING DOCUMENT · CONFIDENTIAL'}
        </span>
      </div>
    </div>
  );
}

