import { useState, useEffect } from 'react';
import api from './api';
import { useLang } from '../context/LanguageContext';

/**
 * Hook to fetch predefined presets by type.
 * Returns translated labels based on current language.
 * Also merges with any existing values from data (for inline-created items).
 */
export default function usePresets(type, existingValues = []) {
  const [presets, setPresets] = useState([]);
  const { lang } = useLang();

  useEffect(() => {
    api.get(`/presets?type=${type}`).then((r) => setPresets(r.data)).catch(() => {});
  }, [type]);

  // Translated labels from presets
  const presetLabels = presets.map((p) => lang === 'fr' ? p.label_fr : p.label_en);

  // Merge with existing values (user-created items not in presets)
  const allOptions = [...new Set([...presetLabels, ...existingValues.filter(Boolean)])];

  return allOptions;
}
