import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fr } from '../i18n/fr';
import { en } from '../i18n/en';

const translations = { fr, en };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'fr');

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) {
        // Fallback to French
        let fallback = translations.fr;
        for (const fk of keys) fallback = fallback?.[fk];
        return fallback || key;
      }
    }
    return val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
