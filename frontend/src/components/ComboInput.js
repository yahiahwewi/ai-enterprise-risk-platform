import { useState, useRef, useEffect } from 'react';

/**
 * ComboInput — Odoo-style select-or-create input.
 *
 * Displays a text input with a dropdown of existing options.
 * User can either select an existing value or type a new one.
 * If the typed value doesn't exist, a "Create: <value>" option appears.
 *
 * Props:
 *   value       - current field value
 *   onChange     - callback(newValue)
 *   options      - array of existing string options
 *   placeholder  - input placeholder text
 *   label        - optional label to show what's being created (e.g. "category")
 *   required     - whether the field is required
 */
export default function ComboInput({ value, onChange, options = [], placeholder = '', label = 'item', required = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const ref = useRef();

  // Sync external value changes
  useEffect(() => { setSearch(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Deduplicated, case-insensitive options
  const uniqueOptions = [...new Set(options.map((o) => o.trim()).filter(Boolean))];

  // Filter options by search
  const filtered = uniqueOptions.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = uniqueOptions.some(
    (opt) => opt.toLowerCase() === search.trim().toLowerCase()
  );

  const handleSelect = (val) => {
    setSearch(val);
    onChange(val);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!open) setOpen(true);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  const showCreate = search.trim() && !exactMatch;

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 pr-8 text-sm text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 w-full mt-1 bg-surface-container-lowest dark:bg-slate-800 rounded-xl shadow-lg border border-surface-container-high dark:border-slate-700 max-h-48 overflow-y-auto">
          {/* Create new option */}
          {showCreate && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2 border-b border-surface-container-high dark:border-slate-700"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span>
              <span className="text-primary font-semibold">Create:</span>
              <span className="text-on-surface dark:text-slate-200 font-medium">"{search.trim()}"</span>
            </button>
          )}

          {/* Existing options */}
          {filtered.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low dark:hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                opt.toLowerCase() === search.trim().toLowerCase()
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-primary font-semibold'
                  : 'text-on-surface dark:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                {opt.toLowerCase() === search.trim().toLowerCase() ? 'check_circle' : 'label'}
              </span>
              {opt}
            </button>
          ))}

          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-3 text-sm text-on-surface-variant text-center">
              No matching {label}s found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
