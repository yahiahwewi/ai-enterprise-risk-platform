import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

export default function Investigations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const { addToast } = useToast();
  const { lang } = useLang();
  const nav = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/investigations');
      setItems(data);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setLoading(false);
    }
  }, [addToast, lang]);

  useEffect(() => { load(); }, [load]);

  const createInv = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/investigations', { title: newTitle, subject: newSubject });
      addToast('success', lang === 'fr' ? 'Investigation ouverte' : 'Investigation opened', '');
      nav(`/investigations/${data._id}`);
    } catch (err) {
      addToast('error', lang === 'fr' ? 'Erreur' : 'Error', err.response?.data?.message || '');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div><section className="mb-10"><h2 className="text-3xl font-extrabold font-headline">
      {lang === 'fr' ? 'Investigations' : 'Investigations'}
    </h2></section><SkeletonTable rows={4} cols={4} /></div>
  );

  const pill = (status) => status === 'open'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

  return (
    <div>
      <ReadOnlyBanner />
      <section className="mb-8 flex items-start gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-[26px] text-red-700">search</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
            {lang === 'fr' ? 'Investigations' : 'Investigations'}
          </h2>
          <p className="text-on-surface-variant mt-1">
            {lang === 'fr'
              ? 'Mode investigation forensique : rattachez des entités, tenez la chronologie, clôturez avec un dossier signé RSA + TSA, opposable en justice.'
              : 'Forensic investigation mode: link entities, keep a timeline, close with a signed RSA + TSA dossier, legally opposable.'}
          </p>
        </div>
      </section>

      {/* Create panel */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-5 mb-8">
        <h3 className="text-sm font-extrabold font-headline uppercase tracking-widest text-on-surface dark:text-slate-100 mb-3">
          {lang === 'fr' ? 'Ouvrir une nouvelle investigation' : 'Open a new investigation'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={lang === 'fr' ? 'Titre (ex. Suspicion fraude client BigCorp Q1)' : 'Title (e.g. Suspected BigCorp fraud Q1)'}
            className="md:col-span-1 bg-surface-container-low dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-slate-200 border-none"
          />
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder={lang === 'fr' ? 'Objet/sujet bref' : 'Short subject'}
            className="md:col-span-1 bg-surface-container-low dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-slate-200 border-none"
          />
          <button
            onClick={createInv}
            disabled={creating || !newTitle.trim()}
            className="executive-gradient text-white text-sm font-bold px-5 py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {lang === 'fr' ? 'Ouvrir' : 'Open'}
          </button>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState icon="search"
                    title={lang === 'fr' ? 'Aucune investigation' : 'No investigations'}
                    message={lang === 'fr' ? 'Ouvrez-en une au-dessus.' : 'Open one above.'} />
      ) : (
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-5">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                <th className="pb-3">{lang === 'fr' ? 'Titre' : 'Title'}</th>
                <th className="pb-3">{lang === 'fr' ? 'Auditeur' : 'Auditor'}</th>
                <th className="pb-3">{lang === 'fr' ? 'Entités' : 'Entities'}</th>
                <th className="pb-3">{lang === 'fr' ? 'Notes' : 'Notes'}</th>
                <th className="pb-3">{lang === 'fr' ? 'Statut' : 'Status'}</th>
                <th className="pb-3">{lang === 'fr' ? 'Mise à jour' : 'Updated'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
              {items.map((i) => (
                <tr key={i._id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => nav(`/investigations/${i._id}`)}>
                  <td className="py-3">
                    <Link to={`/investigations/${i._id}`} className="text-sm font-bold text-on-surface dark:text-slate-200 hover:text-blue-600">
                      {i.title}
                    </Link>
                    {i.subject && <div className="text-[11px] text-on-surface-variant truncate max-w-[320px]">{i.subject}</div>}
                  </td>
                  <td className="py-3 text-sm text-on-surface-variant">{i.auditorName}</td>
                  <td className="py-3 text-sm font-bold">{i.linkedEntities?.length || 0}</td>
                  <td className="py-3 text-sm font-bold">{i.timeline?.length || 0}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pill(i.status)}`}>
                      {i.status === 'open' ? (lang === 'fr' ? 'OUVERTE' : 'OPEN') : (lang === 'fr' ? 'CLÔTURÉE' : 'CLOSED')}
                    </span>
                  </td>
                  <td className="py-3 text-[11px] text-on-surface-variant">{new Date(i.updatedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
