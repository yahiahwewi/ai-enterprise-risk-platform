import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

/**
 * Displayed at the top of any page an auditor visits to make it clear
 * they are in read-only audit mode.
 */
export default function ReadOnlyBanner() {
  const { user } = useAuth();
  const { lang } = useLang();
  if (user?.role !== 'auditor') return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <span className="material-symbols-outlined text-[22px] text-amber-600">visibility</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
          {lang === 'fr' ? 'Mode audit — accès en lecture seule' : 'Audit mode — read-only access'}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 opacity-90">
          {lang === 'fr'
            ? 'Les actions de création, modification et suppression sont désactivées pour garantir la neutralité de l\'audit.'
            : 'Create, update and delete actions are disabled to preserve audit neutrality.'}
        </p>
      </div>
    </div>
  );
}
