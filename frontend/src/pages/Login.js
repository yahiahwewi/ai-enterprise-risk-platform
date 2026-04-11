import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try { await login(form.email, form.password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || t('toast.failed')); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center executive-gradient relative overflow-hidden">
      <div className="absolute top-[-50%] right-[-30%] w-[80%] h-[150%] bg-[radial-gradient(ellipse,rgba(26,107,181,0.15),transparent_70%)] pointer-events-none" />

      {/* Top bar: Info (left) + Language (right) */}
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
          <h2 className="text-xl font-extrabold font-headline text-on-surface dark:text-slate-200">{t('auth.welcomeBack')}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{t('auth.signInSubtitle')}</p>
        </div>
        {error && <div className="bg-error-container text-on-error-container text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">{t('common.email')}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-on-surface dark:text-slate-200" placeholder="name@tac-tic.dz" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">{t('auth.password')}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-on-surface dark:text-slate-200" required />
          </div>
          <button type="submit" className="w-full executive-gradient text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm">{t('auth.signIn')}</button>
        </form>
        <p className="text-center text-sm text-on-surface-variant mt-5">
          {t('auth.noAccount')} <Link to="/register" className="text-primary font-bold hover:underline">{t('auth.createOne')}</Link>
        </p>
      </div>
    </div>
  );
}
