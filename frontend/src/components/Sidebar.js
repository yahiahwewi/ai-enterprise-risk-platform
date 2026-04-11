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
      { to: '/simulate', label: lang === 'fr' ? 'Simulation' : 'Simulation', icon: 'science' },
      { to: '/approvals', label: lang === 'fr' ? 'Approbations' : 'Approvals', icon: 'pending_actions' },
      { to: '/reports', label: t('nav.reports'), icon: 'picture_as_pdf' },
      { section: t('nav.finance') },
      { to: '/transactions', label: t('nav.transactions'), icon: 'receipt_long' },
      { to: '/invoices', label: t('nav.invoices'), icon: 'description' },
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
    ],
    finance: [
      { section: t('nav.overview') },
      { to: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
      { section: t('nav.finance') },
      { to: '/loans', label: t('nav.loans'), icon: 'account_balance' },
      { to: '/assets', label: t('nav.assets'), icon: 'inventory_2' },
    ],
  };
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const navMap = useNavItems(t, lang);
  const items = navMap[user?.role] || [];

  return (
    <aside className="bg-slate-100 dark:bg-slate-900 h-screen w-64 fixed left-0 top-0 flex flex-col py-6 z-50">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <img src="/logo.png" alt="Tac-Tic" className="h-7 w-auto" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ERM AI</span>
        </div>
        <p className="text-xs text-slate-500 font-medium">{t('nav.subtitle')}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {items.map((item, i) =>
          item.section ? (
            <div key={`s-${i}`} className="px-6 pt-5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.section}</div>
          ) : (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              isActive
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-lg mx-2 px-4 py-2.5 flex items-center gap-3 transition-colors text-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 mx-2 px-4 py-2.5 flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium'
            }>
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

      <div className="mt-auto px-4 space-y-3">
        {/* Language selector */}
        <div className="px-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t('common.language')}</p>
          <div className="flex gap-1">
            <button onClick={() => setLang('fr')} className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${lang === 'fr' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
              FR
            </button>
            <button onClick={() => setLang('en')} className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors ${lang === 'en' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
              EN
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-center gap-2 px-2">
          <NotificationBell />
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-900 dark:hover:text-blue-100 transition-colors" title={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}>
            <span className="material-symbols-outlined text-[20px]">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
          </button>
          <button onClick={logout} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors" title={t('common.signOut')}>
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>

        {/* User card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low dark:bg-slate-800">
          <div className="w-9 h-9 rounded-full executive-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-on-surface dark:text-slate-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
