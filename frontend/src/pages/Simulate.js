import { useState } from 'react';
import api from '../services/api';
import KPICard from '../components/KPICard';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LanguageContext';

export default function Simulate() {
  const [params, setParams] = useState({ expenseChange: 0, lateInvoiceCount: 0, rateIncrease: 0 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { lang } = useLang();

  const l = lang === 'fr' ? {
    title: 'Simulation de Scénario', subtitle: 'Simulez l\'impact de changements sur votre profil de risque',
    expenseLabel: 'Variation des dépenses (%)', lateLabel: 'Factures en retard supplémentaires',
    rateLabel: 'Hausse du taux d\'intérêt (%)', run: 'Lancer la simulation', running: 'Calcul...',
    baseline: 'Actuel', simulated: 'Simulé', delta: 'Variation', score: 'Score de risque',
    cashFlow: 'Flux de trésorerie', payments: 'Échéances mensuelles', lateInv: 'Factures en retard',
    impact: 'Impact', high: 'Élevé', medium: 'Moyen', low: 'Faible',
  } : {
    title: 'Scenario Simulation', subtitle: 'Simulate how changes would impact your risk profile',
    expenseLabel: 'Expense change (%)', lateLabel: 'Additional late invoices',
    rateLabel: 'Interest rate increase (%)', run: 'Run Simulation', running: 'Calculating...',
    baseline: 'Current', simulated: 'Simulated', delta: 'Change', score: 'Risk Score',
    cashFlow: 'Cash Flow', payments: 'Monthly Payments', lateInv: 'Late Invoices',
    impact: 'Impact', high: 'High', medium: 'Medium', low: 'Low',
  };

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/simulate', params);
      setResult(data);
    } catch { addToast('error', 'Error', 'Simulation failed'); }
    finally { setLoading(false); }
  };

  const impactColor = { high: 'text-red-600 bg-red-100', medium: 'text-amber-600 bg-amber-100', low: 'text-green-600 bg-green-100' };
  const inputCls = "w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200";

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">{l.title}</h2>
        <p className="text-on-surface-variant mt-2">{l.subtitle}</p>
      </section>

      {/* Sliders */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{l.expenseLabel}</label>
            <input type="range" min="-50" max="100" value={params.expenseChange} onChange={e => setParams({ ...params, expenseChange: Number(e.target.value) })} className="w-full" />
            <div className="text-center text-lg font-bold font-headline mt-1 text-on-surface dark:text-slate-100">{params.expenseChange > 0 ? '+' : ''}{params.expenseChange}%</div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{l.lateLabel}</label>
            <input type="range" min="0" max="10" value={params.lateInvoiceCount} onChange={e => setParams({ ...params, lateInvoiceCount: Number(e.target.value) })} className="w-full" />
            <div className="text-center text-lg font-bold font-headline mt-1 text-on-surface dark:text-slate-100">+{params.lateInvoiceCount}</div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">{l.rateLabel}</label>
            <input type="range" min="0" max="10" step="0.5" value={params.rateIncrease} onChange={e => setParams({ ...params, rateIncrease: Number(e.target.value) })} className="w-full" />
            <div className="text-center text-lg font-bold font-headline mt-1 text-on-surface dark:text-slate-100">+{params.rateIncrease}%</div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <button onClick={run} disabled={loading} className="executive-gradient text-white text-sm font-bold px-8 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto">
            <span className="material-symbols-outlined text-[18px]">{loading ? 'hourglass_top' : 'play_arrow'}</span>
            {loading ? l.running : l.run}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="flex justify-center mb-6">
            <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${impactColor[result.impact]}`}>
              {l.impact}: {l[result.impact]}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Baseline */}
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
              <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-blue-600">radio_button_checked</span>{l.baseline}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <KPICard label={l.score} value={result.baseline.score} icon="assessment" iconColor="blue" progress={result.baseline.score} />
                <KPICard label={l.cashFlow} value={result.baseline.cashFlow} suffix=" TND" icon="account_balance_wallet" iconColor={result.baseline.cashFlow >= 0 ? 'green' : 'red'} />
              </div>
            </div>

            {/* Simulated */}
            <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
              <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">science</span>{l.simulated}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <KPICard label={l.score} value={result.simulated.score} icon="assessment" iconColor={result.simulated.score >= 50 ? 'red' : 'yellow'} progress={result.simulated.score} />
                <KPICard label={l.cashFlow} value={result.simulated.cashFlow} suffix=" TND" icon="account_balance_wallet" iconColor={result.simulated.cashFlow >= 0 ? 'green' : 'red'} />
              </div>
            </div>
          </div>

          {/* Delta */}
          <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
            <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">{l.delta}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard label={l.score} value={`${result.delta.scoreChange > 0 ? '+' : ''}${result.delta.scoreChange}`} icon="trending_up" iconColor={result.delta.scoreChange > 0 ? 'red' : 'green'} />
              <KPICard label={l.cashFlow} value={result.delta.cashFlowChange} suffix=" TND" icon="account_balance_wallet" iconColor={result.delta.cashFlowChange < 0 ? 'red' : 'green'} />
              <KPICard label={l.payments} value={result.delta.paymentsChange} suffix=" TND" icon="payments" iconColor={result.delta.paymentsChange > 0 ? 'red' : 'green'} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
