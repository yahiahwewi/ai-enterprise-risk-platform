import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLang } from '../context/LanguageContext';

// ── static catalogues ──────────────────────────────────────────────────
const PAGES = [
  {
    fr: 'Tableau de bord',
    en: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard',
    keywords: 'home accueil overview',
  },
  {
    fr: 'Analyse de Risque',
    en: 'Risk Analysis',
    icon: 'assessment',
    path: '/risk-report',
    keywords: 'score ia ai prediction risque',
  },
  {
    fr: 'Vue Exécutive',
    en: 'Executive View',
    icon: 'monitoring',
    path: '/executive',
    keywords: 'fiscal calendar boardroom',
  },
  {
    fr: 'Décision IA',
    en: 'AI Decision',
    icon: 'auto_awesome',
    path: '/final-decision',
    keywords: 'recommendation',
  },
  {
    fr: 'Simulation',
    en: 'Simulation',
    icon: 'science',
    path: '/simulate',
    keywords: 'scenario stress',
  },
  {
    fr: 'Transactions',
    en: 'Transactions',
    icon: 'receipt_long',
    path: '/transactions',
    keywords: 'income expense flux',
  },
  {
    fr: 'Factures',
    en: 'Invoices',
    icon: 'description',
    path: '/invoices',
    keywords: 'invoice client paid late',
  },
  {
    fr: 'Prêts',
    en: 'Loans',
    icon: 'account_balance',
    path: '/loans',
    keywords: 'loan debt credit',
  },
  {
    fr: 'Actifs',
    en: 'Assets',
    icon: 'inventory_2',
    path: '/assets',
    keywords: 'asset depreciation',
  },
  {
    fr: 'Approbations',
    en: 'Approvals',
    icon: 'pending_actions',
    path: '/approvals',
    keywords: 'workflow validation',
  },
  {
    fr: 'Rapports PDF',
    en: 'PDF Reports',
    icon: 'picture_as_pdf',
    path: '/reports',
    keywords: 'pdf signature certified rsa tsa',
  },
  {
    fr: 'Mémos de risque',
    en: 'Risk Memos',
    icon: 'flag',
    path: '/risk-memos',
    keywords: 'memo escalation alert',
  },
  {
    fr: 'Investigations',
    en: 'Investigations',
    icon: 'search_check',
    path: '/investigations',
    keywords: 'forensic audit dossier',
  },
  {
    fr: 'Permissions',
    en: 'Permissions',
    icon: 'admin_panel_settings',
    path: '/permissions',
    keywords: 'rbac role admin',
  },
  {
    fr: "Journal d'activité",
    en: 'Activity Log',
    icon: 'history',
    path: '/activity',
    keywords: 'audit trail log',
  },
];

const QUICK_ACTIONS = [
  {
    fr: 'Factures en retard',
    en: 'Overdue invoices',
    icon: 'warning',
    path: '/invoices?filter=late',
    color: '#c8102e',
  },
  {
    fr: 'Factures non payées',
    en: 'Unpaid invoices',
    icon: 'pending',
    path: '/invoices?filter=pending',
    color: '#b8860b',
  },
  {
    fr: 'Transactions > 10 000 TND',
    en: 'Transactions > 10,000 TND',
    icon: 'paid',
    path: '/transactions?min=10000',
    color: '#002b4c',
  },
  {
    fr: 'Prêts à haut risque',
    en: 'High-risk loans',
    icon: 'priority_high',
    path: '/loans?risk=high',
    color: '#c8102e',
  },
  {
    fr: 'Mémos critiques',
    en: 'Critical memos',
    icon: 'crisis_alert',
    path: '/risk-memos?severity=critical',
    color: '#c8102e',
  },
  {
    fr: 'Investigations actives',
    en: 'Active investigations',
    icon: 'search_check',
    path: '/investigations?status=active',
    color: '#7c3aed',
  },
  {
    fr: 'Approbations en attente',
    en: 'Pending approvals',
    icon: 'fact_check',
    path: '/approvals',
    color: '#b8860b',
  },
  {
    fr: 'Alertes des dernières 24h',
    en: 'Last 24h alerts',
    icon: 'notifications_active',
    path: '/alerts?period=24h',
    color: '#c8102e',
  },
];

const fmt = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v || 0);
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ──────────────────────────────────────────────────────────────────────
export default function GlobalSearch() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [data, setData] = useState({ tx: [], inv: [], loans: [], memos: [], invs: [] });
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // lazy fetch entities the first time the panel opens
  const loadedRef = useRef(false);
  const loadEntities = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const [tx, inv, ln, mm, iv] = await Promise.all([
        api.get('/transactions').catch(() => ({ data: [] })),
        api.get('/invoices').catch(() => ({ data: [] })),
        api.get('/loans').catch(() => ({ data: [] })),
        api.get('/risk-memos').catch(() => ({ data: [] })),
        api.get('/investigations').catch(() => ({ data: [] })),
      ]);
      setData({
        tx: Array.isArray(tx.data) ? tx.data : [],
        inv: Array.isArray(inv.data) ? inv.data : [],
        loans: Array.isArray(ln.data) ? ln.data : [],
        memos: Array.isArray(mm.data) ? mm.data : mm.data?.memos || [],
        invs: Array.isArray(iv.data) ? iv.data : iv.data?.investigations || [],
      });
    } catch {
      /* no-op */
    }
  }, []);

  // ── result computation ───────────────────────────────────────────────
  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return null; // no live results — caller shows suggestions panel

    const match = (...fields) => fields.some((f) => norm(f).includes(q));

    const pages = PAGES.filter((p) => match(p.fr, p.en, p.keywords, p.path))
      .slice(0, 5)
      .map((p) => ({
        kind: 'page',
        icon: p.icon,
        primary: lang === 'fr' ? p.fr : p.en,
        secondary: p.path,
        path: p.path,
      }));

    const tx = data.tx
      .filter((t) => match(t.category, t.description, t.reference, String(t.amount)))
      .slice(0, 5)
      .map((t) => ({
        kind: 'transaction',
        icon: t.type === 'income' ? 'trending_up' : 'trending_down',
        iconColor: t.type === 'income' ? '#0d7a4a' : '#c8102e',
        primary: t.category || '—',
        secondary:
          t.description ||
          (t.type === 'income'
            ? lang === 'fr'
              ? 'Revenu'
              : 'Income'
            : lang === 'fr'
              ? 'Dépense'
              : 'Expense'),
        meta: (t.type === 'expense' ? '-' : '+') + fmt(t.amount) + ' TND',
        metaColor: t.type === 'expense' ? '#c8102e' : '#0d7a4a',
        path: '/transactions',
      }));

    const invs = data.inv
      .filter((i) => match(i.clientName, i.reference, String(i.amount), i.status))
      .slice(0, 5)
      .map((i) => ({
        kind: 'invoice',
        icon: 'description',
        iconColor: '#b8860b',
        primary: i.clientName || '—',
        secondary: i.dueDate
          ? `${lang === 'fr' ? 'Échéance' : 'Due'} ${new Date(i.dueDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')} · ${i.status}`
          : i.status || '',
        meta: fmt(i.amount) + ' TND',
        metaColor: i.status === 'late' ? '#c8102e' : '#0b1f33',
        path: '/invoices',
      }));

    const loans = data.loans
      .filter((l) => match(String(l.amount), String(l.interestRate), String(l.duration)))
      .slice(0, 5)
      .map((l) => ({
        kind: 'loan',
        icon: 'account_balance',
        iconColor: '#7c3aed',
        primary: fmt(l.amount) + ' TND',
        secondary: `${l.interestRate}% · ${l.duration} ${lang === 'fr' ? 'mois' : 'mo'}`,
        meta: `${l.interestRate}%`,
        metaColor: l.interestRate > 8 ? '#c8102e' : '#0b1f33',
        path: '/loans',
      }));

    const memos = (data.memos || [])
      .filter((m) => match(m.title, m.severity, m.description))
      .slice(0, 5)
      .map((m) => ({
        kind: 'memo',
        icon: 'flag',
        iconColor:
          m.severity === 'critical' ? '#c8102e' : m.severity === 'high' ? '#e67e22' : '#b8860b',
        primary: m.title || '—',
        secondary: m.severity,
        path: '/risk-memos',
      }));

    const investigations = (data.invs || [])
      .filter((iv) => match(iv.title, iv.status))
      .slice(0, 5)
      .map((iv) => ({
        kind: 'investigation',
        icon: 'search_check',
        iconColor: '#7c3aed',
        primary: iv.title || '—',
        secondary: iv.status,
        path: '/investigations',
      }));

    const groups = [
      { id: 'pages', label: lang === 'fr' ? 'Pages' : 'Pages', items: pages },
      { id: 'transactions', label: lang === 'fr' ? 'Transactions' : 'Transactions', items: tx },
      { id: 'invoices', label: lang === 'fr' ? 'Factures' : 'Invoices', items: invs },
      { id: 'loans', label: lang === 'fr' ? 'Prêts' : 'Loans', items: loans },
      { id: 'memos', label: lang === 'fr' ? 'Mémos' : 'Memos', items: memos },
      {
        id: 'investigations',
        label: lang === 'fr' ? 'Investigations' : 'Investigations',
        items: investigations,
      },
    ].filter((g) => g.items.length > 0);

    return groups;
  }, [query, data, lang]);

  // flatten for keyboard nav
  const flat = useMemo(() => {
    if (!open) return [];
    if (!query.trim()) {
      return [
        ...QUICK_ACTIONS.map((a, i) => ({
          ...a,
          kind: 'quick',
          primary: lang === 'fr' ? a.fr : a.en,
          idx: i,
        })),
        ...PAGES.slice(0, 4).map((p, i) => ({
          ...p,
          kind: 'page',
          primary: lang === 'fr' ? p.fr : p.en,
          idx: QUICK_ACTIONS.length + i,
        })),
      ];
    }
    const arr = [];
    (results || []).forEach((g) => g.items.forEach((it) => arr.push(it)));
    return arr;
  }, [open, query, results, lang]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  const go = (item) => {
    if (!item) return;
    setOpen(false);
    setQuery('');
    if (item.path) navigate(item.path);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    }
  };

  const onFocus = () => {
    setOpen(true);
    loadEntities();
  };

  // ── render helpers ───────────────────────────────────────────────────
  const renderItem = (item, idx) => {
    const isActive = idx === active;
    return (
      <button
        key={`${item.kind}-${idx}`}
        onMouseEnter={() => setActive(idx)}
        onClick={() => go(item)}
        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
          isActive
            ? 'bg-[#f6f2ea] dark:bg-slate-700'
            : 'hover:bg-[#fafaf5] dark:hover:bg-slate-700/50'
        }`}
      >
        <span
          className="material-symbols-outlined text-[18px] shrink-0"
          style={{ color: item.iconColor || item.color || '#002b4c' }}
        >
          {item.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#0b1f33] dark:text-slate-100 truncate">
            {item.primary}
          </div>
          {item.secondary && (
            <div className="text-[11px] text-[#6b7280] dark:text-slate-400 truncate">
              {item.secondary}
            </div>
          )}
        </div>
        {item.meta && (
          <span
            className="text-[12px] font-bold tabular-nums shrink-0"
            style={{ color: item.metaColor || '#0b1f33' }}
          >
            {item.meta}
          </span>
        )}
      </button>
    );
  };

  // index counter to map keyboard nav to the right group
  let cursor = 0;

  return (
    <div ref={wrapRef} className="relative max-w-md flex-1 hidden md:block">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8672] text-[18px] pointer-events-none">
        search
      </span>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={
          lang === 'fr'
            ? 'Rechercher des risques, factures, transactions… (⌘K)'
            : 'Search risks, invoices, transactions… (⌘K)'
        }
        className="w-full rounded-full py-1.5 pl-10 pr-12 text-sm transition-all outline-none focus:ring-2 focus:ring-[#002b4c]/20"
        style={{ background: '#ffffff', border: '1px solid #e5ddce', color: '#0b1f33' }}
        type="text"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8672] hover:text-[#002b4c]"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-[#e5ddce] dark:border-slate-700 overflow-hidden"
          style={{ zIndex: 80, maxHeight: '70vh', overflowY: 'auto' }}
        >
          {/* — Empty query: suggestions — */}
          {!query.trim() && (
            <>
              <div className="px-4 pt-3 pb-2">
                <p className="small-caps text-[10px] text-[#6b7280] tracking-[0.18em]">
                  {lang === 'fr' ? 'Raccourcis stratégiques' : 'Strategic shortcuts'}
                </p>
              </div>
              <div className="px-2 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {QUICK_ACTIONS.map((a, i) => {
                  const idx = cursor++;
                  const isActive = idx === active;
                  return (
                    <button
                      key={i}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(a)}
                      className={`text-left flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-[#f6f2ea] dark:bg-slate-700'
                          : 'hover:bg-[#fafaf5] dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[18px] shrink-0"
                        style={{ color: a.color }}
                      >
                        {a.icon}
                      </span>
                      <span className="text-[12px] font-semibold text-[#0b1f33] dark:text-slate-100 truncate">
                        {lang === 'fr' ? a.fr : a.en}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-[#e5ddce] dark:border-slate-700 px-4 pt-3 pb-2">
                <p className="small-caps text-[10px] text-[#6b7280] tracking-[0.18em]">
                  {lang === 'fr' ? 'Pages' : 'Pages'}
                </p>
              </div>
              <div className="px-2 pb-3">
                {PAGES.slice(0, 4).map((p, i) => {
                  const idx = cursor++;
                  return renderItem(
                    {
                      kind: 'page',
                      icon: p.icon,
                      iconColor: '#002b4c',
                      primary: lang === 'fr' ? p.fr : p.en,
                      secondary: p.path,
                      path: p.path,
                    },
                    idx
                  );
                })}
              </div>
            </>
          )}

          {/* — With query: grouped live results — */}
          {query.trim() && results && results.length === 0 && (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#cbd0d8]">
                search_off
              </span>
              <p className="text-sm text-[#6b7280] mt-2">
                {lang === 'fr' ? `Aucun résultat pour « ${query} »` : `No results for "${query}"`}
              </p>
              <p className="text-[11px] text-[#9ca3af] italic mt-1">
                {lang === 'fr'
                  ? 'Essayez un nom de client, une catégorie ou un montant.'
                  : 'Try a client name, category or amount.'}
              </p>
            </div>
          )}

          {query.trim() && results && results.length > 0 && (
            <div className="py-2">
              {results.map((g) => (
                <div key={g.id} className="mb-1">
                  <div className="px-4 py-1.5">
                    <p className="small-caps text-[10px] text-[#6b7280] tracking-[0.18em]">
                      {g.label}
                    </p>
                  </div>
                  <div className="px-2">
                    {g.items.map((it) => {
                      const idx = cursor++;
                      return renderItem(it, idx);
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* — Footer — */}
          <div className="border-t border-[#e5ddce] dark:border-slate-700 px-4 py-2 flex items-center justify-between text-[10px] text-[#9ca3af]">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f2ea] dark:bg-slate-700 font-mono">
                  ↑↓
                </kbd>{' '}
                {lang === 'fr' ? 'naviguer' : 'navigate'}
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f2ea] dark:bg-slate-700 font-mono">
                  ↵
                </kbd>{' '}
                {lang === 'fr' ? 'ouvrir' : 'open'}
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f2ea] dark:bg-slate-700 font-mono">
                  Esc
                </kbd>{' '}
                {lang === 'fr' ? 'fermer' : 'close'}
              </span>
            </div>
            <span className="font-semibold text-[#002b4c]">⌘K</span>
          </div>
        </div>
      )}
    </div>
  );
}
