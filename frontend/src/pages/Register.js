import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import api from '../services/api';

export default function Register() {
  const { t, lang, setLang } = useLang();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'accountant' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || t('toast.failed'));
    }
  };

  const roleLabels = {
    fr: { accountant: 'Comptable', finance: 'Directeur Financier' },
    en: { accountant: 'Accountant', finance: 'Finance Manager' },
  };
  const rl = roleLabels[lang] || roleLabels.fr;

  return (
    <div className="min-h-screen flex items-center justify-center executive-gradient relative overflow-hidden">
      <div className="absolute top-[-50%] right-[-30%] w-[80%] h-[150%] bg-[radial-gradient(ellipse,rgba(26,107,181,0.15),transparent_70%)] pointer-events-none" />

      <div className="absolute top-4 left-4 z-20">
        <Link to="/about" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-xs font-medium">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>FAQ & Info</span>
        </Link>
      </div>
      <div className="absolute top-4 right-4 z-20 flex gap-1">
        <button onClick={() => setLang('fr')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${lang === 'fr' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}>FR</button>
        <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${lang === 'en' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}>EN</button>
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 w-full max-w-[420px] shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Tac-Tic" className="h-9 mx-auto mb-4" />
          <h2 className="text-xl font-extrabold font-headline text-on-surface dark:text-slate-200">
            {lang === 'fr' ? 'Demander un accès' : 'Request Access'}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {lang === 'fr' ? 'Votre compte sera activé après validation par l\'administrateur' : 'Your account will be activated after admin approval'}
          </p>
        </div>

        {success ? (
          /* Success — pending message */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-amber-600 text-[32px]">hourglass_top</span>
            </div>
            <h3 className="text-lg font-bold font-headline text-on-surface dark:text-slate-200 mb-2">
              {lang === 'fr' ? 'Demande envoyée' : 'Request Submitted'}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {lang === 'fr'
                ? 'Votre compte a été créé et est en attente de validation par l\'administrateur. Vous recevrez l\'accès une fois approuvé.'
                : 'Your account has been created and is pending admin approval. You will get access once approved.'}
            </p>
            <Link to="/login" className="executive-gradient text-white text-sm font-bold px-6 py-2.5 rounded-lg inline-block hover:opacity-90 transition-opacity">
              {lang === 'fr' ? 'Retour à la connexion' : 'Back to Sign In'}
            </Link>
          </div>
        ) : (
          /* Registration form */
          <>
            {error && <div className="bg-error-container text-on-error-container text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">{t('auth.fullName')}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-on-surface dark:text-slate-200" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">{t('common.email')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-on-surface dark:text-slate-200" placeholder="name@tac-tic.tn" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">{t('auth.password')}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-on-surface dark:text-slate-200" placeholder="Min. 6 characters" required minLength={6} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">{t('common.role')}</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-on-surface dark:text-slate-200">
                  <option value="accountant">{rl.accountant}</option>
                  <option value="finance">{rl.finance}</option>
                </select>
              </div>
              <button type="submit" className="w-full executive-gradient text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm">
                {lang === 'fr' ? 'Envoyer la demande' : 'Submit Request'}
              </button>
            </form>
            <p className="text-center text-sm text-on-surface-variant mt-5">
              {t('auth.hasAccount')} <Link to="/login" className="text-primary font-bold hover:underline">{t('auth.signInLink')}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
