/**
 * Permissions.js — editorial panel for Admin / Owner.
 * Lists every action-level permission grouped by module.
 * Each row lets the user toggle roles and, for approval permissions,
 * set a monetary threshold + bypass roles.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { SkeletonKPIGrid } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const ROLE_META = {
  admin:      { fr: 'Admin',      en: 'Admin',      color: '#0b1f33' },
  owner:      { fr: 'Owner',      en: 'Owner',      color: '#b8860b' },
  accountant: { fr: 'Comptable',  en: 'Accountant', color: '#006666' },
  finance:    { fr: 'Finance',    en: 'Finance',    color: '#0e7690' },
  analyst:    { fr: 'Analyste',   en: 'Analyst',    color: '#5b21b6' },
  auditor:    { fr: 'Auditeur',   en: 'Auditor',    color: '#7f1d1d' },
};

export default function Permissions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();
  const { lang } = useLang();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/permissions');
      setData(data);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setLoading(false);
    }
  }, [addToast, lang]);

  useEffect(() => { load(); }, [load]);

  const savePermission = async (key, patch) => {
    setSavingKey(key);
    try {
      const { data: updated } = await api.patch(`/permissions/${encodeURIComponent(key)}`, patch);
      setData((prev) => {
        const perms = prev.permissions.map((p) => (p.key === key ? updated : p));
        const groups = {};
        perms.forEach((p) => {
          groups[p.module] ||= [];
          groups[p.module].push(p);
        });
        return { ...prev, permissions: perms, groups };
      });
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally { setSavingKey(null); }
  };

  const toggleRole = (perm, role, listKey = 'allowedRoles') => {
    const current = perm[listKey] || [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    savePermission(perm.key, { [listKey]: next });
  };

  const updateThreshold = (perm, value) => {
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0) savePermission(perm.key, { threshold: num });
  };

  const resetDefaults = async () => {
    setResetOpen(false);
    try {
      await api.post('/permissions/reset');
      addToast('success', lang === 'fr' ? 'Réinitialisé' : 'Reset', '');
      await load();
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    }
  };

  const filteredGroups = useMemo(() => {
    if (!data) return {};
    const q = search.trim().toLowerCase();
    if (!q) return data.groups;
    const result = {};
    for (const [mod, perms] of Object.entries(data.groups)) {
      const matches = perms.filter((p) =>
        p.label.toLowerCase().includes(q) ||
        (p.labelEn || '').toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        mod.toLowerCase().includes(q)
      );
      if (matches.length) result[mod] = matches;
    }
    return result;
  }, [data, search]);

  if (loading || !data) return (
    <div>
      <Header search="" onSearch={() => {}} onReset={() => {}} />
      <SkeletonKPIGrid count={3} />
    </div>
  );

  const ROLES = data.roles;

  return (
    <div>
      <Header onReset={() => setResetOpen(true)} onSearch={setSearch} search={search} />

      {/* Legend */}
      <div className="editorial-card p-4 mb-6 flex items-center flex-wrap gap-4">
        <span className="small-caps" style={{ color: '#6b7280' }}>
          {lang === 'fr' ? 'Rôles' : 'Roles'}
        </span>
        {ROLES.map((r) => (
          <div key={r} className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: ROLE_META[r]?.color || '#64748b' }} />
            <span className="text-[12px] font-semibold text-[#0b1f33]">
              {ROLE_META[r]?.[lang === 'fr' ? 'fr' : 'en'] || r}
            </span>
          </div>
        ))}
      </div>

      {/* Modules */}
      {Object.entries(filteredGroups).map(([module, perms]) => (
        <section key={module} className="mb-7">
          <h3 className="font-editorial text-[22px] font-bold text-[#0b1f33] mb-3"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {module}
          </h3>

          <div className="editorial-card overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: '#faf7f2', borderBottom: '1px solid #e5ddce' }}>
                  <th className="text-left small-caps px-4 py-3" style={{ color: '#6b7280' }}>
                    {lang === 'fr' ? 'Permission' : 'Permission'}
                  </th>
                  {ROLES.map((r) => (
                    <th key={r} className="text-center small-caps px-2 py-3" style={{ color: '#6b7280' }}>
                      {ROLE_META[r]?.[lang === 'fr' ? 'fr' : 'en'] || r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map((p) => (
                  <PermissionRow
                    key={p.key}
                    perm={p}
                    roles={ROLES}
                    onToggle={(role) => toggleRole(p, role, 'allowedRoles')}
                    onToggleBypass={(role) => toggleRole(p, role, 'bypassRoles')}
                    onThreshold={(v) => updateThreshold(p, v)}
                    saving={savingKey === p.key}
                    lang={lang}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {Object.keys(filteredGroups).length === 0 && (
        <div className="editorial-card p-8 text-center text-[#6b7280] italic">
          {lang === 'fr' ? 'Aucune permission ne correspond à la recherche.'
                          : 'No permission matches the search.'}
        </div>
      )}

      {/* Reset modal — rendered via portal to escape ancestor transforms */}
      {resetOpen && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={() => setResetOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 goals-pop"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[24px] text-[#c8102e]">warning</span>
              <h3 className="font-editorial text-[20px] font-bold text-[#0b1f33]"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                {lang === 'fr' ? 'Réinitialiser les permissions' : 'Reset permissions'}
              </h3>
            </div>
            <p className="text-sm text-[#4a5568] mb-6">
              {lang === 'fr'
                ? 'Toutes les permissions seront remises à leur valeur par défaut recommandée. Les rôles personnalisés seront perdus.'
                : 'All permissions will be reset to their recommended defaults. Custom role assignments will be lost.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetOpen(false)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-slate-100 text-[#0b1f33] hover:bg-slate-200">
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button onClick={resetDefaults}
                      className="flex-1 py-2.5 rounded-lg text-sm font-extrabold text-white bg-[#c8102e] hover:bg-[#9e0a24]">
                {lang === 'fr' ? 'Confirmer' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────
function PermissionRow({ perm, roles, onToggle, onToggleBypass, onThreshold, saving, lang }) {
  const isApproval = perm.category === 'approval';
  const isThreshold = isApproval && perm.threshold !== undefined;
  return (
    <>
      <tr style={{ borderBottom: '1px solid #f0eadb' }} className={`${saving ? 'opacity-60' : ''}`}>
        <td className="px-4 py-3">
          <div className="text-[13px] font-semibold text-[#0b1f33]">{lang === 'fr' ? perm.label : (perm.labelEn || perm.label)}</div>
          <div className="text-[10px] font-mono text-[#8b8672] mt-0.5">{perm.key}</div>
          {perm.description && (
            <div className="text-[11px] text-[#6b7280] italic mt-1">
              {perm.description}
            </div>
          )}
        </td>
        {roles.map((r) => {
          const enabled = (perm.allowedRoles || []).includes(r);
          const bypassed = (perm.bypassRoles || []).includes(r);
          // For approval threshold permissions, allowed = role can approve,
          // bypass = role can skip approval. We show two checkboxes stacked.
          return (
            <td key={r} className="text-center px-2 py-3">
              <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" checked={enabled} onChange={() => onToggle(r)}
                       disabled={saving}
                       className="w-4 h-4 accent-[#002b4c] cursor-pointer" />
                {isThreshold && (
                  <label className="inline-flex items-center gap-1 text-[9px] text-[#6b7280] cursor-pointer">
                    <input type="checkbox" checked={bypassed} onChange={() => onToggleBypass(r)}
                           disabled={saving}
                           className="w-3 h-3 accent-[#b8860b] cursor-pointer" />
                    <span className="small-caps" style={{ fontSize: 8, letterSpacing: '0.05em' }}>
                      {lang === 'fr' ? 'Bypass' : 'Skip'}
                    </span>
                  </label>
                )}
              </label>
            </td>
          );
        })}
      </tr>

      {isThreshold && (
        <tr style={{ borderBottom: '1px solid #f0eadb', background: '#fbfaf6' }}>
          <td colSpan={roles.length + 1} className="px-4 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="small-caps" style={{ color: '#6b7280' }}>
                {lang === 'fr' ? 'Seuil' : 'Threshold'}
              </span>
              <input
                type="range" min="0" max="200000" step="500"
                defaultValue={perm.threshold}
                onMouseUp={(e) => onThreshold(e.target.value)}
                onTouchEnd={(e) => onThreshold(e.target.value)}
                className="flex-1 max-w-md accent-[#002b4c]"
              />
              <div className="font-editorial text-[18px] font-bold text-[#002b4c]"
                   style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                {(perm.threshold || 0).toLocaleString('fr-FR')} {perm.thresholdCurrency || 'TND'}
              </div>
              <input type="number" min="0" step="500" defaultValue={perm.threshold}
                     onBlur={(e) => onThreshold(e.target.value)}
                     className="w-32 px-2 py-1 rounded-lg border border-[#e5ddce] text-[12px] text-[#0b1f33]"
                     placeholder="0" />
            </div>
            <p className="text-[11px] text-[#6b7280] italic mt-1.5">
              {lang === 'fr'
                ? 'Une coche « Bypass » exempte le rôle de la règle d\'approbation même si le seuil est dépassé.'
                : 'A "Skip" check exempts the role from the approval rule even if the threshold is exceeded.'}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────
function Header({ onReset = () => {}, onSearch = () => {}, search = '' }) {
  const { lang } = useLang();
  return (
    <section className="mb-6 flex items-start justify-between flex-wrap gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: '#f0eadb' }}>
          <span className="material-symbols-outlined text-[26px]" style={{ color: '#002b4c' }}>lock_person</span>
        </div>
        <div className="min-w-0">
          <h2 className="font-editorial text-[34px] font-black leading-none text-[#0b1f33]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            {lang === 'fr' ? 'Permissions & Rôles' : 'Permissions & Roles'}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-2 max-w-2xl">
            {lang === 'fr'
              ? 'Configurez qui peut faire quoi dans la plateforme. Toute modification est appliquée immédiatement sur les rôles concernés.'
              : 'Configure who can do what on the platform. Every change is applied immediately to the affected roles.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b8672] text-[16px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={lang === 'fr' ? 'Filtrer…' : 'Filter…'}
            className="pl-8 pr-3 py-1.5 rounded-lg text-sm text-[#0b1f33]"
            style={{ background: '#ffffff', border: '1px solid #e5ddce' }}
          />
        </div>
        <button onClick={onReset}
                className="editorial-btn-ghost text-xs flex items-center gap-1.5"
                title={lang === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}>
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          {lang === 'fr' ? 'Réinitialiser' : 'Reset'}
        </button>
      </div>
    </section>
  );
}
