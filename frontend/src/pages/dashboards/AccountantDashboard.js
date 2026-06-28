import { useState, useEffect } from 'react';
import api from '../../services/api';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import ComboInput from '../../components/ComboInput';
import { SkeletonKPIGrid, SkeletonTable } from '../../components/Skeleton';
import FinancialInsights from '../../components/FinancialInsights';
import { useToast } from '../../context/ToastContext';
import { useLang } from '../../context/LanguageContext';
import usePresets from '../../services/usePresets';

export default function AccountantDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txForm, setTxForm] = useState({
    type: 'income',
    amount: '',
    category: '',
    description: '',
  });
  const [invForm, setInvForm] = useState({
    clientName: '',
    amount: '',
    dueDate: '',
    status: 'pending',
  });
  const { addToast } = useToast();
  const { t } = useLang();
  const categoryOptions = usePresets(
    'transaction_category',
    transactions.map((tx) => tx.category)
  );
  const clientOptions = usePresets(
    'client',
    invoices.map((i) => i.clientName)
  );

  useEffect(() => {
    Promise.all([api.get('/transactions'), api.get('/invoices')])
      .then(([tx, inv]) => {
        setTransactions(tx.data);
        setInvoices(inv.data);
      })
      .catch(() => addToast('error', t('toast.error'), 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  const addTransaction = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/transactions', {
        ...txForm,
        amount: Number(txForm.amount),
      });
      setTransactions([data, ...transactions]);
      setTxForm({ type: 'income', amount: '', category: '', description: '' });
      addToast('success', t('toast.transactionAdded'), `${txForm.type} of ${txForm.amount} TND`);
    } catch (err) {
      addToast('error', t('toast.error'), err.response?.data?.message || 'Failed');
    }
  };

  const addInvoice = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/invoices', { ...invForm, amount: Number(invForm.amount) });
      setInvoices([data, ...invoices]);
      setInvForm({ clientName: '', amount: '', dueDate: '', status: 'pending' });
      addToast('success', t('toast.invoiceCreated'), `Invoice for ${invForm.clientName} created`);
    } catch (err) {
      addToast('error', t('toast.error'), err.response?.data?.message || 'Failed');
    }
  };

  const updateInvoiceStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/invoices/${id}`, { status });
      setInvoices(invoices.map((inv) => (inv._id === id ? data : inv)));
      addToast('success', t('toast.updated'), `Invoice marked as ${status}`);
    } catch {
      addToast('error', t('toast.error'), 'Failed to update');
    }
  };

  if (loading)
    return (
      <div>
        <section className="mb-10">
          <h2 className="text-3xl font-extrabold font-headline tracking-tight">
            {t('accountant.title')}
          </h2>
        </section>
        <SkeletonKPIGrid count={4} />
        <SkeletonTable />
      </div>
    );

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface dark:text-slate-100">
          {t('accountant.title')}
        </h2>
        <p className="text-on-surface-variant mt-2">{t('accountant.subtitle')}</p>
      </section>

      <div className="mb-8">
        <FinancialInsights />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KPICard
          label={t('accountant.totalIncome')}
          value={totalIncome}
          suffix=" TND"
          icon="trending_up"
          iconColor="green"
        />
        <KPICard
          label={t('accountant.totalExpenses')}
          value={totalExpenses}
          suffix=" TND"
          icon="trending_down"
          iconColor="red"
        />
        <KPICard
          label={t('accountant.invoices')}
          value={invoices.length}
          icon="description"
          iconColor="blue"
        />
        <KPICard
          label={t('accountant.unpaid')}
          value={invoices.filter((i) => i.status !== 'paid').length}
          icon="warning"
          iconColor="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {t('accountant.addTransaction')}
          </h3>
          <form onSubmit={addTransaction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('accountant.type')}
                </label>
                <select
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                  className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200"
                >
                  <option value="income">{t('accountant.income')}</option>
                  <option value="expense">{t('accountant.expense')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('common.amount')}
                </label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200"
                  placeholder="0.00"
                  required
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('accountant.category')}
                </label>
                <ComboInput
                  value={txForm.category}
                  onChange={(val) => setTxForm({ ...txForm, category: val })}
                  options={categoryOptions}
                  placeholder={t('accountant.selectCategory')}
                  label="category"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('accountant.description')}
                </label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200"
                  placeholder="Optional"
                />
              </div>
            </div>
            <button
              type="submit"
              className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              {t('accountant.addTransaction')}
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
          <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
            {t('accountant.addInvoice')}
          </h3>
          <form onSubmit={addInvoice} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('accountant.client')}
                </label>
                <ComboInput
                  value={invForm.clientName}
                  onChange={(val) => setInvForm({ ...invForm, clientName: val })}
                  options={clientOptions}
                  placeholder={t('accountant.selectClient')}
                  label="client"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('common.amount')}
                </label>
                <input
                  type="number"
                  value={invForm.amount}
                  onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })}
                  className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200"
                  placeholder="0.00"
                  required
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('accountant.dueDate')}
                </label>
                <input
                  type="date"
                  value={invForm.dueDate}
                  onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
                  className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  {t('common.status')}
                </label>
                <select
                  value={invForm.status}
                  onChange={(e) => setInvForm({ ...invForm, status: e.target.value })}
                  className="w-full bg-surface-container-low dark:bg-slate-700 border-none rounded-lg py-2 px-3 text-sm text-on-surface dark:text-slate-200"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="executive-gradient text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              {t('accountant.addInvoice')}
            </button>
          </form>
        </div>
      </div>

      {/* Tables */}
      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
          {t('accountant.recentTransactions')}
        </h3>
        {transactions.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title={t('accountant.noTransactions')}
            message={t('accountant.noTransactionsMsg')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('common.date')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('accountant.type')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('accountant.category')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3 text-right">
                    {t('common.amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
                {transactions.slice(0, 10).map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="py-3 text-sm text-on-surface dark:text-slate-300">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-on-surface dark:text-slate-300">
                      {tx.category}
                    </td>
                    <td className="py-3 text-sm font-bold text-on-surface dark:text-slate-200 text-right">
                      {tx.amount.toLocaleString()} TND
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold font-headline text-on-surface dark:text-slate-100 mb-4">
          {t('accountant.invoiceList')}
        </h3>
        {invoices.length === 0 ? (
          <EmptyState
            icon="description"
            title={t('accountant.noInvoices')}
            message={t('accountant.noInvoicesMsg')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('accountant.client')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('common.amount')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('accountant.dueDate')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('common.status')}
                  </th>
                  <th className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pb-3">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high dark:divide-slate-700">
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-surface-container-low dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="py-3 text-sm font-medium text-on-surface dark:text-slate-200">
                      {inv.clientName}
                    </td>
                    <td className="py-3 text-sm text-on-surface dark:text-slate-300">
                      {inv.amount.toLocaleString()} TND
                    </td>
                    <td className="py-3 text-sm text-on-surface-variant">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'late' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => updateInvoiceStatus(inv._id, 'paid')}
                          className="executive-gradient text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90"
                        >
                          {t('common.markPaid')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
