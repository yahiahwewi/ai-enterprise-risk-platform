import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import api from '../services/api';

export default function Register() {
  const { t, lang, setLang } = useLang();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'accountant' });
  const [error, setError] = useState('');
  // step: 'form' → 'otp' → 'done'
  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const roleLabels = {
    fr: { accountant: 'Comptable', finance: 'Directeur Financier', analyst: 'Analyste des risques', auditor: 'Auditeur' },
    en: { accountant: 'Accountant', finance: 'Finance Manager',    analyst: 'Risk Analyst',         auditor: 'Auditor'  },
  };
  const rl = roleLabels[lang] || roleLabels.fr;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setInfo(data?.message || '');
      setCooldown(60);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (err) {
      setError(err.response?.data?.message || t('toast.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const txt = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (txt.length) {
      e.preventDefault();
      const next = txt.padEnd(6, '').split('').slice(0, 6);
      while (next.length < 6) next.push('');
      setOtp(next);
      otpRefs.current[Math.min(txt.length, 5)]?.focus();
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    const code = otp.join('');
    if (code.length !== 6) {
      setError(lang === 'fr' ? 'Veuillez saisir les 6 chiffres.' : 'Please enter all 6 digits.');
      setLoading(false);
      return;
    }
    try {
      await api.post('/auth/verify-email', { email: form.email, code });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || t('toast.failed'));
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0) return;
    setError(''); setInfo('');
    try {
      const { data } = await api.post('/auth/resend-otp', { email: form.email });
      setInfo(data?.message || (lang === 'fr' ? 'Nouveau code envoyé.' : 'New code sent.'));
      setCooldown(60);
    } catch (err) {
      const cd = err.response?.data?.cooldownSeconds;
      if (cd) setCooldown(cd);
      setError(err.response?.data?.message || t('toast.failed'));
    }
  };

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

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-8 w-full max-w-[440px] shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Tac-Tic" className="h-9 mx-auto mb-4" />
          <h2 className="text-xl font-extrabold font-headline text-on-surface dark:text-slate-200">
            {step === 'form'
              ? (lang === 'fr' ? 'Demander un accès' : 'Request Access')
              : step === 'otp'
              ? (lang === 'fr' ? 'Vérifier votre email' : 'Verify your email')
              : (lang === 'fr' ? 'Demande envoyée' : 'Request Submitted')}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {step === 'form' && (lang === 'fr'
              ? 'Un code de vérification sera envoyé par email'
              : 'A verification code will be sent to your email')}
            {step === 'otp' && (lang === 'fr'
              ? <>Saisissez le code à 6 chiffres envoyé à <strong className="text-on-surface dark:text-slate-200">{form.email}</strong></>
              : <>Enter the 6-digit code sent to <strong className="text-on-surface dark:text-slate-200">{form.email}</strong></>)}
            {step === 'done' && (lang === 'fr'
              ? 'Email vérifié — en attente de validation'
              : 'Email verified — awaiting approval')}
          </p>
        </div>

        {error && <div className="bg-error-container text-on-error-container text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}
        {info  && !error && <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm px-4 py-2.5 rounded-lg mb-4">{info}</div>}

        {step === 'form' && (
          <>
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
                  <option value="analyst">{rl.analyst}</option>
                  <option value="auditor">{rl.auditor}</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="w-full executive-gradient text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
                {loading
                  ? (lang === 'fr' ? 'Envoi...' : 'Sending...')
                  : (lang === 'fr' ? 'Envoyer la demande' : 'Submit Request')}
              </button>
            </form>
            <p className="text-center text-sm text-on-surface-variant mt-5">
              {t('auth.hasAccount')} <Link to="/login" className="text-primary font-bold hover:underline">{t('auth.signInLink')}</Link>
            </p>
          </>
        )}

        {step === 'otp' && (
          <>
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    inputMode="numeric"
                    maxLength={1}
                    className="w-12 h-14 text-center text-2xl font-bold font-mono bg-surface-container-low dark:bg-slate-700 border-2 border-transparent focus:border-blue-500 rounded-lg text-on-surface dark:text-slate-200 outline-none transition-colors"
                  />
                ))}
              </div>
              <button type="submit" disabled={loading} className="w-full executive-gradient text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
                {loading
                  ? (lang === 'fr' ? 'Vérification...' : 'Verifying...')
                  : (lang === 'fr' ? 'Vérifier le code' : 'Verify code')}
              </button>
            </form>
            <div className="flex items-center justify-between text-xs mt-4">
              <button onClick={() => { setStep('form'); setError(''); setInfo(''); }} className="text-on-surface-variant hover:underline">
                {lang === 'fr' ? '← Modifier l\'email' : '← Change email'}
              </button>
              <button onClick={resendOtp} disabled={cooldown > 0} className="text-primary font-bold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                {cooldown > 0
                  ? (lang === 'fr' ? `Renvoyer (${cooldown}s)` : `Resend (${cooldown}s)`)
                  : (lang === 'fr' ? 'Renvoyer le code' : 'Resend code')}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-600 text-[32px]">mark_email_read</span>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              {lang === 'fr'
                ? 'Email vérifié avec succès. Votre compte est désormais soumis à la validation de l\'administrateur. Vous recevrez un email dès qu\'il sera approuvé.'
                : 'Email verified successfully. Your account is now awaiting admin approval. You will receive an email once approved.'}
            </p>
            <Link to="/login" className="executive-gradient text-white text-sm font-bold px-6 py-2.5 rounded-lg inline-block hover:opacity-90 transition-opacity">
              {lang === 'fr' ? 'Retour à la connexion' : 'Back to Sign In'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
