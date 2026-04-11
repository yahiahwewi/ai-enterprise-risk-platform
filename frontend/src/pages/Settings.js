import { useState, useEffect } from 'react';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";
const labelCls = "block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1";

const tabs = [
  { key: 'transaction_category', icon: 'category', fr: 'Catégories', en: 'Categories' },
  { key: 'client', icon: 'people', fr: 'Clients', en: 'Clients' },
];

export default function Settings() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transaction_category');
  const [form, setForm] = useState({ value: '', label_fr: '', label_en: '' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ label_fr: '', label_en: '' });
  const [deleting, setDeleting] = useState(null);
  const { addToast } = useToast();
  const { lang } = useLang();

  const l = {
    fr: {
      title: 'Paramètres', subtitle: 'Gérer les catégories, types et clients prédéfinis',
      add: 'Ajouter', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer',
      confirmDelete: 'Supprimer ?', yes: 'Oui', no: 'Non',
      value: 'Identifiant', labelFr: 'Libellé FR', labelEn: 'Libellé EN',
      noData: 'Aucun élément', noDataMsg: 'Ajoutez un élément ci-dessus.',
      added: 'Ajouté', updated: 'Mis à jour', deleted: 'Supprimé',
    },
    en: {
      title: 'Settings', subtitle: 'Manage predefined categories, types and clients',
      add: 'Add', save: 'Save', cancel: 'Cancel', delete: 'Delete',
      confirmDelete: 'Delete?', yes: 'Yes', no: 'No',
      value: 'Key', labelFr: 'Label FR', labelEn: 'Label EN',
      noData: 'No items', noDataMsg: 'Add an item above.',
      added: 'Added', updated: 'Updated', deleted: 'Deleted',
    },
  };
  const t = l[lang] || l.fr;

  const fetchPresets = () => {
    api.get('/presets/all').then((r) => setPresets(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPresets(); }, []);

  const filtered = presets.filter((p) => p.type === activeTab);

  const addPreset = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/presets', { ...form, type: activeTab });
      setPresets([...presets, data]);
      setForm({ value: '', label_fr: '', label_en: '' });
      addToast('success', t.added, form.label_fr);
    } catch (err) { addToast('error', 'Error', err.response?.data?.message || 'Failed'); }
  };

  const startEdit = (p) => {
    setEditing(p._id);
    setEditForm({ label_fr: p.label_fr, label_en: p.label_en });
  };

  const saveEdit = async (id) => {
    try {
      const { data } = await api.patch(`/presets/${id}`, editForm);
      setPresets(presets.map((p) => (p._id === id ? data : p)));
      setEditing(null);
      addToast('success', t.updated, editForm.label_fr);
    } catch { addToast('error', 'Error', 'Failed'); }
  };

  const deletePreset = async (id) => {
    try {
      await api.delete(`/presets/${id}`);
      setPresets(presets.filter((p) => p._id !== id));
      setDeleting(null);
      addToast('success', t.deleted, '');
    } catch { addToast('error', 'Error', 'Failed'); }
  };

  if (loading) return (<div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">{t.title}</h2></section><SkeletonTable /></div>);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{t.title}</h2>
        <p className="text-on-surface-variant mt-2">{t.subtitle}</p>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors ${activeTab === tab.key ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {lang === 'fr' ? tab.fr : tab.en}
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
          {t.add}
        </h3>
        <form onSubmit={addPreset} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>{t.value}</label>
            <input type="text" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })} className={inputCls} placeholder="ex: salaries" required />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>{t.labelFr}</label>
            <input type="text" value={form.label_fr} onChange={(e) => setForm({ ...form, label_fr: e.target.value })} className={inputCls} placeholder="ex: Salaires" required />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={labelCls}>{t.labelEn}</label>
            <input type="text" value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} className={inputCls} placeholder="ex: Salaries" required />
          </div>
          <button type="submit" className="executive-gradient text-white text-xs font-bold px-5 py-2.5 rounded-lg hover:opacity-90 flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {t.add}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
          {lang === 'fr' ? tabs.find((t) => t.key === activeTab)?.fr : tabs.find((t) => t.key === activeTab)?.en} ({filtered.length})
        </h3>

        {filtered.length === 0 ? (
          <EmptyState icon="inbox" title={t.noData} message={t.noDataMsg} />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p._id} className="flex items-center justify-between p-3 bg-surface-container-low dark:bg-slate-700/50 rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all">
                {editing === p._id ? (
                  /* Edit mode */
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-on-surface-variant font-mono bg-surface-container-high dark:bg-slate-600 px-2 py-0.5 rounded">{p.value}</span>
                    <input type="text" value={editForm.label_fr} onChange={(e) => setEditForm({ ...editForm, label_fr: e.target.value })} className={inputCls + ' max-w-[200px]'} />
                    <input type="text" value={editForm.label_en} onChange={(e) => setEditForm({ ...editForm, label_en: e.target.value })} className={inputCls + ' max-w-[200px]'} />
                    <button onClick={() => saveEdit(p._id)} className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90">{t.save}</button>
                    <button onClick={() => setEditing(null)} className="text-xs font-bold text-on-surface-variant hover:text-on-surface px-2">{t.cancel}</button>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs text-on-surface-variant font-mono bg-surface-container-high dark:bg-slate-600 px-2 py-0.5 rounded">{p.value}</span>
                      <span className="text-sm font-bold text-on-surface dark:text-slate-200">{p.label_fr}</span>
                      <span className="text-xs text-on-surface-variant">/ {p.label_en}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      {deleting === p._id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deletePreset(p._id)} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg">{t.yes}</button>
                          <button onClick={() => setDeleting(null)} className="text-xs font-bold text-on-surface-variant px-1">{t.no}</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleting(p._id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
