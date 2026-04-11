import { useLang } from '../context/LanguageContext';

export default function TopNavbar() {
  const { t } = useLang();

  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center px-8 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
          <input className="w-full bg-surface-container-low dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-body text-on-surface dark:text-slate-200 placeholder:text-slate-400" placeholder={t('common.search')} type="text" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-500 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"><span className="material-symbols-outlined text-[22px]">help</span></button>
      </div>
    </header>
  );
}
