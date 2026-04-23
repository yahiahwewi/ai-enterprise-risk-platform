import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';

function useNavItems(t, lang) {
  return {
    admin: [
      { section: t('nav.overview') },
      { to: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { to: '/users', label: t('nav.manageUsers'), icon: 'group' },
      { to: '/approvals', label: lang === 'fr' ? 'Approbations' : 'Approvals', icon: 'pending_actions' },
      { section: t('nav.system') },
      { to: '/activity', label: t('nav.activityLog'), icon: 'history' },
      { to: '/settings', label: t('nav.settings'), icon: 'settings' },
    ],
    owner: [
      { section: t('nav.overview') },
      { to: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { to: '/executive', label: lang === 'fr' ? 'Vue Exécutive' : 'Executive View', icon: 'monitoring' },
      { to: '/risk-report', label: t('nav.riskAnalysis'), icon: 'assessment' },
      { to: '/final-decision', label: t('nav.aiDecision'), icon: 'auto_awesome' },
      { to: '/goals', label: lang === 'fr' ? 'Stratégie' : 'Strategy', icon: 'flag' },
      { to: '/simulate', label: lang === 'fr' ? 'Simulation' : 'Simulation', icon: 'science' },
      { to: '/approvals', label: lang === 'fr' ? 'Approbations' : 'Approvals', icon: 'pending_actions' },
      { to: '/alerts', label: lang === 'fr' ? 'Alertes critiques' : 'Critical alerts', icon: 'crisis_alert' },
      { to: '/investigations', label: lang === 'fr' ? 'Investigations' : 'Investigations', icon: 'search' },
      { to: '/reports', label: t('nav.reports'), icon: 'picture_as_pdf' },
      { section: t('nav.finance') },
      { to: '/transactions', label: t('nav.transactions'), icon: 'receipt_long' },
      { to: '/invoices', label: t('nav.invoices'), icon: 'description' },
      { to: '/extract-invoice', label: lang === 'fr' ? 'Import Facture IA' : 'AI Invoice Import', icon: 'document_scanner' },
      { to: '/loans', label: t('nav.loans'), icon: 'account_balance' },
      { to: '/assets', label: t('nav.assets'), icon: 'inventory_2' },
      { section: t('nav.organization') },
      { to: '/team', label: t('nav.team'), icon: 'people' },
      { to: '/activity', label: t('nav.activityLog'), icon: 'history' },
    ],
    accountant: [
      { section: t('nav.overview') },
      { to: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { section: t('nav.finance') },
      { to: '/transactions', label: t('nav.transactions'), icon: 'receipt_long' },
      { to: '/invoices', label: t('nav.invoices'), icon: 'description' },
      { to: '/extract-invoice', label: lang === 'fr' ? 'Import Facture IA' : 'AI Invoice Import', icon: 'document_scanner' },
    ],
    finance: [
      { section: t('nav.overview') },
      { to: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { section: t('nav.finance') },
      { to: '/loans', label: t('nav.loans'), icon: 'account_balance' },
      { to: '/assets', label: t('nav.assets'), icon: 'inventory_2' },
    ],
    analyst: [
      { section: lang === 'fr' ? 'Espace analyste' : 'Analyst workspace' },
      { to: '/analyst', label: lang === 'fr' ? 'Tableau de bord' : 'Workbench', icon: 'insights' },
      { section: lang === 'fr' ? 'Analyse des risques' : 'Risk analysis' },
      { to: '/risk-report', label: lang === 'fr' ? 'Rapport de risque' : 'Risk report', icon: 'assessment' },
      { to: '/final-decision', label: lang === 'fr' ? 'Décision IA' : 'AI decision', icon: 'auto_awesome' },
      { to: '/simulate', label: lang === 'fr' ? 'Simulation' : 'Simulation', icon: 'science' },
    ],
    auditor: [
      { section: lang === 'fr' ? 'Audit' : 'Audit' },
      { to: '/audit', label: lang === 'fr' ? 'Tableau de bord audit' : 'Audit dashboard', icon: 'fact_check' },
      { to: '/investigations', label: lang === 'fr' ? 'Investigations' : 'Investigations', icon: 'search' },
      { to: '/reports', label: lang === 'fr' ? 'Rapports certifiés' : 'Certified reports', icon: 'picture_as_pdf' },
      { to: '/activity', label: t('nav.activityLog'), icon: 'history' },
      { section: lang === 'fr' ? 'Consultation' : 'Consultation' },
      { to: '/invoices', label: t('nav.invoices'), icon: 'description' },
      { to: '/transactions', label: t('nav.transactions'), icon: 'receipt_long' },
      { to: '/loans', label: t('nav.loans'), icon: 'account_balance' },
      { to: '/assets', label: t('nav.assets'), icon: 'inventory_2' },
    ],
  };
}

const BRAND_BY_ROLE = {
  owner:      { main: 'Sentinel',       sub: 'ENTERPRISE RISK' },
  admin:      { main: 'Sentinel',       sub: 'ADMIN SUITE' },
  accountant: { main: 'Sentinel',       sub: 'FINANCE DESK' },
  finance:    { main: 'Sentinel',       sub: 'TREASURY' },
  analyst:    { main: 'Risk Editorial', sub: 'ANALYST SUITE' },
  auditor:    { main: 'Risk Editorial', sub: 'AUDIT OFFICE' },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const navMap = useNavItems(t, lang);
  const items = navMap[user?.role] || [];
  const brand = BRAND_BY_ROLE[user?.role] || BRAND_BY_ROLE.owner;

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 z-50"
           style={{ background: '#faf7f2', borderRight: '1px solid #e5ddce' }}>
      {/* Brand */}
      <div className="px-6 mb-7">
        <div className="text-2xl font-headline font-extrabold text-editorial-ink leading-tight"
             style={{ fontFamily: 'Playfair Display, Georgia, serif', letterSpacing: '-0.02em' }}>
          {brand.main}
        </div>
        <div className="small-caps text-editorial-navy mt-1">{brand.sub}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-1">
        {items.map((item, i) =>
          item.section ? (
            <div key={`s-${i}`} className="px-5 pt-5 pb-2 small-caps"
                 style={{ color: '#8b8672' }}>
              {item.section}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? 'mx-2 px-4 py-2.5 flex items-center gap-3 rounded-lg text-[13px] font-semibold transition-colors'
                  : 'mx-2 px-4 py-2.5 flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors hover:bg-[#efe8dc]'
              }
              style={({ isActive }) => isActive ? {
                background: '#002b4c', color: '#ffffff'
              } : { color: '#4a5568' }}
            >
              <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

      {/* Footer controls */}
      <div className="mt-auto px-4 space-y-3 pt-4" style={{ borderTop: '1px solid #e5ddce' }}>
        {/* Language + theme row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-1">
            <button onClick={() => setLang('fr')}
                    className={`text-[10px] font-bold py-1 px-2 rounded-md transition-colors small-caps`}
                    style={{ background: lang === 'fr' ? '#002b4c' : 'transparent', color: lang === 'fr' ? '#ffffff' : '#6b7280' }}>
              FR
            </button>
            <button onClick={() => setLang('en')}
                    className={`text-[10px] font-bold py-1 px-2 rounded-md transition-colors small-caps`}
                    style={{ background: lang === 'en' ? '#002b4c' : 'transparent', color: lang === 'en' ? '#ffffff' : '#6b7280' }}>
              EN
            </button>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={toggleTheme}
                    className="p-1.5 rounded-md transition-colors hover:bg-[#efe8dc]"
                    title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
                    style={{ color: '#6b7280' }}>
              <span className="material-symbols-outlined text-[18px]">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <button onClick={logout}
                    className="p-1.5 rounded-md transition-colors hover:bg-[#fbe9ec]"
                    title={t('common.signOut')}
                    style={{ color: '#6b7280' }}>
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>

        {/* User card — editorial style */}
        <div className="flex items-center gap-3 p-3 rounded-lg"
             style={{ background: '#f0eadb' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
               style={{ background: '#002b4c' }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate" style={{ color: '#0b1f33' }}>{user?.name}</p>
            <p className="small-caps" style={{ color: '#8b8672' }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
