import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function CopilotChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { lang } = useLang();

  // Only show for owner role
  if (user?.role !== 'owner') return null;

  const l = lang === 'fr' ? {
    title: 'Copilote IA', placeholder: 'Posez une question...', send: 'Envoyer',
    suggestions: ['Quel est le niveau de risque ?', 'Pourquoi le risque augmente ?', 'Prévision de trésorerie ?'],
  } : {
    title: 'AI Copilot', placeholder: 'Ask a question...', send: 'Send',
    suggestions: ['What is the risk level?', 'Why is risk increasing?', 'Cash flow forecast?'],
  };

  const ask = async (question) => {
    if (!question.trim()) return;
    const q = question.trim();
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/copilot', { question: q, language: lang });
      setMessages(prev => [...prev, { role: 'ai', text: data.answer, suggestions: data.suggestions }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: lang === 'fr' ? 'Erreur de connexion.' : 'Connection error.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 w-14 h-14 executive-gradient text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50">
        <span className="material-symbols-outlined text-[24px]">{open ? 'close' : 'auto_awesome'}</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-[380px] max-h-[500px] bg-surface-container-lowest dark:bg-slate-800 rounded-xl shadow-xl border border-surface-container-high dark:border-slate-700 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface-container-high dark:border-slate-700 flex items-center gap-2">
            <div className="p-1.5 bg-primary-fixed dark:bg-blue-900/30 rounded-lg">
              <span className="material-symbols-outlined text-primary text-[16px] filled">auto_awesome</span>
            </div>
            <span className="text-sm font-bold font-headline text-on-surface dark:text-slate-200">{l.title}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 340 }}>
            {messages.length === 0 && (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 block mb-3">psychology</span>
                <p className="text-xs text-on-surface-variant mb-4">{lang === 'fr' ? 'Posez une question sur vos finances' : 'Ask about your finances'}</p>
                <div className="space-y-1.5">
                  {l.suggestions.map((s, i) => (
                    <button key={i} onClick={() => ask(s)} className="block w-full text-left text-xs bg-surface-container-low dark:bg-slate-700 text-on-surface dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-surface-container-highest dark:hover:bg-slate-600 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'executive-gradient text-white' : 'bg-surface-container-low dark:bg-slate-700 text-on-surface dark:text-slate-200'}`}>
                  {msg.text}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-slate-200 dark:border-slate-600 pt-2">
                      {msg.suggestions.map((s, j) => (
                        <button key={j} onClick={() => ask(s)} className="block w-full text-left text-[10px] text-primary dark:text-blue-300 hover:underline">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low dark:bg-slate-700 px-3 py-2 rounded-xl text-xs text-on-surface-variant">
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-surface-container-high dark:border-slate-700">
            <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={l.placeholder} className="flex-1 bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-xs text-on-surface dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20" />
              <button type="submit" disabled={loading || !input.trim()} className="executive-gradient text-white px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
