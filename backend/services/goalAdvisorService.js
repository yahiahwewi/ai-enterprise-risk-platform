const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Asset = require('../models/Asset');

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/** Format a number as a currency string (TND) */
const fmt = (n) => `${Math.round(n).toLocaleString('fr-TN')} TND`;

/** Round to 1 decimal place */
const r1 = (n) => Math.round(n * 10) / 10;

/** Format debtToAsset ratio — null means "no assets" */
const fmtDebtRatio = (v, lang = 'fr') =>
  v === null ? (lang === 'fr' ? 'Sans actifs' : 'No assets') : `${r1(v * 100)}%`;

/** Format expense ratio — null means "no income" */
const fmtExpRatio = (v, lang = 'fr') =>
  v === null ? (lang === 'fr' ? 'Sans revenus' : 'No revenue') : `${r1(v * 100)}%`;

/**
 * Aggregate all financial data from MongoDB in a single pass.
 * Returns raw collections + computed KPIs.
 */
async function collectMetrics() {
  const [invoices, loans, transactions, assets] = await Promise.all([
    Invoice.find().lean(),
    Loan.find().lean(),
    Transaction.find().lean(),
    Asset.find().lean(),
  ]);

  // ── Invoices ──────────────────────────────────────────
  const lateInvoices  = invoices.filter(i => i.status === 'late');
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
  const totalInvoices = invoices.length;

  const lateInvoiceCount  = lateInvoices.length;
  const lateInvoiceAmount = lateInvoices.reduce((s, i) => s + i.amount, 0);
  const unpaidAmount      = unpaidInvoices.reduce((s, i) => s + i.amount, 0);
  const invoiceRevenue    = invoices.reduce((s, i) => s + i.amount, 0);

  // Group invoices by client (for top-client analysis)
  const clientMap = {};
  invoices.forEach(inv => {
    if (!clientMap[inv.clientName]) clientMap[inv.clientName] = { total: 0, count: 0, late: 0 };
    clientMap[inv.clientName].total += inv.amount;
    clientMap[inv.clientName].count += 1;
    if (inv.status === 'late') clientMap[inv.clientName].late += 1;
  });
  const topClients = Object.entries(clientMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const lateRate = totalInvoices > 0 ? (lateInvoiceCount / totalInvoices) * 100 : 0;

  // ── Transactions ──────────────────────────────────────
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cashFlow = income - expenses;

  // Monthly averages (last 12 months window)
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const recentTx = transactions.filter(t => new Date(t.date) >= twelveMonthsAgo);
  const months = 12;
  const monthlyIncome   = recentTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)  / months;
  const monthlyExpenses = recentTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / months;

  // Category breakdown (expenses)
  const expCategoryMap = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expCategoryMap[t.category] = (expCategoryMap[t.category] || 0) + t.amount;
  });
  const topExpenseCategories = Object.entries(expCategoryMap)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Category breakdown (income)
  const incCategoryMap = {};
  transactions.filter(t => t.type === 'income').forEach(t => {
    incCategoryMap[t.category] = (incCategoryMap[t.category] || 0) + t.amount;
  });
  const topIncomeCategories = Object.entries(incCategoryMap)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Use null sentinel instead of 999 magic number when division is undefined
  const expenseRatio = income > 0 ? expenses / income : (expenses > 0 ? null : 0);

  // ── Loans ─────────────────────────────────────────────
  const totalDebt      = loans.reduce((s, l) => s + l.amount, 0);
  const monthlyPayments = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const sortedLoansByRate = [...loans].sort((a, b) => b.interestRate - a.interestRate);
  const highestRateLoan = sortedLoansByRate[0] || null;
  const avgInterestRate = loans.length > 0
    ? loans.reduce((s, l) => s + l.interestRate, 0) / loans.length
    : 0;

  // ── Assets ────────────────────────────────────────────
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const lowValueAssets = [...assets]
    .filter(a => a.value > 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);

  // ── Derived ratios ────────────────────────────────────
  // Use null sentinel instead of 999 magic number when assets = 0
  const debtToAsset = totalAssets > 0 ? totalDebt / totalAssets : (totalDebt > 0 ? null : 0);
  const paymentToIncome = monthlyIncome > 0 ? (monthlyPayments / monthlyIncome) * 100 : (monthlyPayments > 0 ? 999 : 0);

  return {
    // Raw collections
    invoices, loans, transactions, assets,
    // Invoice KPIs
    lateInvoiceCount, lateInvoiceAmount, unpaidAmount, totalInvoices,
    invoiceRevenue, lateRate, topClients,
    // Transaction KPIs
    income, expenses, cashFlow,
    monthlyIncome, monthlyExpenses,
    expenseRatio, topExpenseCategories, topIncomeCategories,
    // Loan KPIs
    totalDebt, monthlyPayments, sortedLoansByRate,
    highestRateLoan, avgInterestRate,
    // Asset KPIs
    totalAssets, lowValueAssets,
    // Derived
    debtToAsset, paymentToIncome,
  };
}

// ─────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────

const T = {
  fr: {
    // Section titles
    invoicesTitle:     'Factures & Créances',
    loansTitle:        'Prêts & Endettement',
    transactionsTitle: 'Flux de Trésorerie',
    assetsTitle:       'Actifs & Patrimoine',
    // Action labels
    viewInvoices:  'Voir les factures',
    viewLoans:     'Gérer les prêts',
    viewTrx:       'Voir les transactions',
    viewAssets:    'Voir les actifs',
    addInvoice:    'Ajouter une facture',
    addLoan:       'Ajouter un prêt',
    addAsset:      'Ajouter un actif',
    addTrx:        'Ajouter une transaction',
    // Metric labels
    lateInvoices:    'Factures en retard',
    unpaidAmount:    'Montant impayé',
    cashFlow:        'Trésorerie nette',
    monthlyPayments: 'Mensualités totales',
    totalDebt:       'Dette totale',
    totalAssets:     'Actifs totaux',
    debtRatio:       'Ratio dette/actifs',
    expenseRatio:    'Ratio dépenses/revenus',
    lateRate:        'Taux de retard',
    // Timeframes
    tf_growth:       '6–12 mois',
    tf_stability:    '3–6 mois',
    tf_debt:         '12–24 mois',
    tf_revenue:      '3–9 mois',
    tf_recovery:     '1–3 mois',
    tf_excellence:   '6–12 mois',
    noData:          'Aucune donnée disponible',
  },
  en: {
    invoicesTitle:     'Invoices & Receivables',
    loansTitle:        'Loans & Debt',
    transactionsTitle: 'Cash Flow',
    assetsTitle:       'Assets & Wealth',
    viewInvoices:  'View invoices',
    viewLoans:     'Manage loans',
    viewTrx:       'View transactions',
    viewAssets:    'View assets',
    addInvoice:    'Add invoice',
    addLoan:       'Add loan',
    addAsset:      'Add asset',
    addTrx:        'Add transaction',
    lateInvoices:    'Late invoices',
    unpaidAmount:    'Unpaid amount',
    cashFlow:        'Net cash flow',
    monthlyPayments: 'Total monthly payments',
    totalDebt:       'Total debt',
    totalAssets:     'Total assets',
    debtRatio:       'Debt-to-asset ratio',
    expenseRatio:    'Expense ratio',
    lateRate:        'Late rate',
    tf_growth:       '6–12 months',
    tf_stability:    '3–6 months',
    tf_debt:         '12–24 months',
    tf_revenue:      '3–9 months',
    tf_recovery:     '1–3 months',
    tf_excellence:   '6–12 months',
    noData:          'No data available',
  },
};

// ─────────────────────────────────────────────────────────
// SCENARIO BUILDERS
// Each returns { sections[], headline, targetScore, timeframe }
// ─────────────────────────────────────────────────────────

// ── GROWTH ───────────────────────────────────────────────
function buildGrowth(m, lang) {
  const t = T[lang];
  const isFr = lang === 'fr';
  const sections = [];

  // 1. Invoices
  const invSuggestions = [];
  if (m.lateRate > 15) {
    invSuggestions.push({
      id: 'inv-late-collection',
      priority: 'high',
      title: isFr
        ? `Récupérer les ${m.lateInvoiceCount} factures en retard`
        : `Recover ${m.lateInvoiceCount} overdue invoices`,
      description: isFr
        ? `Vous avez ${m.lateInvoiceCount} factures en retard totalisant ${fmt(m.lateInvoiceAmount)}. Ce capital immobilisé peut financer votre croissance. Lancez une campagne de relance immédiate.`
        : `You have ${m.lateInvoiceCount} overdue invoices totalling ${fmt(m.lateInvoiceAmount)}. This locked capital can fund your growth. Launch an immediate collection campaign.`,
      impact: isFr
        ? `Récupération estimée : jusqu'à ${fmt(m.lateInvoiceAmount)} de trésorerie libérée`
        : `Estimated recovery: up to ${fmt(m.lateInvoiceAmount)} in freed cash flow`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.lateInvoices, value: `${m.lateInvoiceCount} (${fmt(m.lateInvoiceAmount)})` },
    });
  }
  if (m.unpaidAmount > 0 && m.lateRate <= 15) {
    invSuggestions.push({
      id: 'inv-accelerate-collection',
      priority: 'medium',
      title: isFr ? 'Accélérer le recouvrement' : 'Accelerate collection',
      description: isFr
        ? `${fmt(m.unpaidAmount)} de factures impayées restent en attente. Proposer un escompte de 2% pour paiement sous 7 jours peut réduire ce montant rapidement.`
        : `${fmt(m.unpaidAmount)} in unpaid invoices remain outstanding. Offering a 2% discount for payment within 7 days can reduce this quickly.`,
      impact: isFr
        ? `Améliore la trésorerie opérationnelle et accélère le cycle de recouvrement`
        : `Improves operational cash flow and accelerates the collection cycle`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.unpaidAmount, value: fmt(m.unpaidAmount) },
    });
  }
  if (m.lateRate <= 10 && m.totalInvoices > 0) {
    invSuggestions.push({
      id: 'inv-expand-credit',
      priority: 'medium',
      title: isFr ? 'Étendre les délais de paiement aux nouveaux clients' : 'Extend payment terms to new clients',
      description: isFr
        ? `Votre taux de recouvrement est excellent (taux de retard : ${r1(m.lateRate)}%). Vous pouvez offrir des délais de 30 à 45 jours à de nouveaux prospects pour stimuler la croissance commerciale.`
        : `Your collection rate is excellent (late rate: ${r1(m.lateRate)}%). You can offer 30–45 day terms to new prospects to boost commercial growth.`,
      impact: isFr
        ? `Peut augmenter le volume de facturation de 15 à 25% sur 6 mois`
        : `Can increase invoice volume by 15–25% over 6 months`,
      actionLabel: t.addInvoice,
      actionLink: '/invoices',
      metric: { label: t.lateRate, value: `${r1(m.lateRate)}%` },
    });
  }
  if (invSuggestions.length === 0) {
    invSuggestions.push({
      id: 'inv-new-clients',
      priority: 'low',
      title: isFr ? 'Créer vos premières factures' : 'Create your first invoices',
      description: isFr
        ? `Aucune facture enregistrée. Commencez à facturer vos clients pour suivre vos créances et financer votre croissance.`
        : `No invoices recorded. Start invoicing clients to track receivables and fund your growth.`,
      impact: isFr ? 'Indispensable pour monitorer votre cycle de revenus' : 'Essential for monitoring your revenue cycle',
      actionLabel: t.addInvoice,
      actionLink: '/invoices',
      metric: null,
    });
  }

  sections.push({
    category: 'invoices',
    icon: 'receipt_long',
    color: 'blue',
    title: t.invoicesTitle,
    suggestions: invSuggestions.slice(0, 4),
  });

  // 2. Loans
  const loanSuggestions = [];
  if (m.debtToAsset < 0.5 && m.cashFlow >= 0) {
    loanSuggestions.push({
      id: 'loan-strategic-expansion',
      priority: 'medium',
      title: isFr ? 'Contracter un prêt stratégique de croissance' : 'Take a strategic growth loan',
      description: isFr
        ? `Votre ratio dette/actifs est de ${fmtDebtRatio(m.debtToAsset, lang)} — un niveau sain. Avec une trésorerie positive (${fmt(m.cashFlow)}), vous avez la capacité d'emprunter pour financer une expansion commerciale.`
        : `Your debt-to-asset ratio is ${fmtDebtRatio(m.debtToAsset, lang)} — a healthy level. With positive cash flow (${fmt(m.cashFlow)}), you have borrowing capacity to finance a commercial expansion.`,
      impact: isFr
        ? `Un financement bien structuré peut accélérer la croissance sans compromettre la solvabilité`
        : `Well-structured financing can accelerate growth without compromising solvency`,
      actionLabel: t.addLoan,
      actionLink: '/loans',
      metric: { label: t.debtRatio, value: `${fmtDebtRatio(m.debtToAsset, lang)}` },
    });
  } else if (m.debtToAsset >= 0.5) {
    loanSuggestions.push({
      id: 'loan-stabilize-first',
      priority: 'high',
      title: isFr ? 'Stabiliser la dette avant de croître' : 'Stabilize debt before growing',
      description: isFr
        ? `Ratio dette/actifs élevé (${fmtDebtRatio(m.debtToAsset, 'fr')}). Contracter un nouveau prêt maintenant augmenterait le risque financier. Réduisez l'endettement existant (${fmt(m.totalDebt)}) avant d'envisager une expansion.`
        : `High debt-to-asset ratio (${fmtDebtRatio(m.debtToAsset, 'en')}). Taking on new debt now would increase financial risk. Reduce existing debt (${fmt(m.totalDebt)}) before considering expansion.`,
      impact: isFr
        ? `Prévient la surexposition au risque de crédit et préserve votre cote de crédit`
        : `Prevents credit risk overexposure and preserves your credit rating`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: t.totalDebt, value: fmt(m.totalDebt) },
    });
  } else {
    loanSuggestions.push({
      id: 'loan-first-loan',
      priority: 'low',
      title: isFr ? 'Explorer le financement par prêt' : 'Explore loan financing',
      description: isFr
        ? `Aucun prêt actif. Un financement externe peut accélérer votre croissance si votre plan d'affaires est solide.`
        : `No active loans. External financing can accelerate your growth if your business plan is solid.`,
      impact: isFr ? 'Levier financier pour accélérer le développement' : 'Financial leverage to accelerate development',
      actionLabel: t.addLoan,
      actionLink: '/loans',
      metric: null,
    });
  }

  sections.push({
    category: 'loans',
    icon: 'account_balance',
    color: 'purple',
    title: t.loansTitle,
    suggestions: loanSuggestions,
  });

  // 3. Transactions
  const trxSuggestions = [];
  if (m.income > 0 && m.expenseRatio < 0.6) {
    const surplus = m.income - m.expenses;
    trxSuggestions.push({
      id: 'trx-reinvest-surplus',
      priority: 'high',
      title: isFr ? 'Réinvestir le surplus de trésorerie' : 'Reinvest cash surplus',
      description: isFr
        ? `Votre ratio dépenses/revenus est de ${fmtExpRatio(m.expenseRatio, lang)} — excellent. Vous dégagez un surplus de ${fmt(surplus)}. Allouez-le à l'acquisition de clients, à la R&D ou à de nouveaux marchés.`
        : `Your expense ratio is ${fmtExpRatio(m.expenseRatio, lang)} — excellent. You generate a surplus of ${fmt(surplus)}. Allocate it to client acquisition, R&D, or new markets.`,
      impact: isFr
        ? `Réinvestir 70% du surplus peut générer un ROI de 20–40% en 12 mois`
        : `Reinvesting 70% of the surplus can generate a 20–40% ROI over 12 months`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: t.expenseRatio, value: `${fmtExpRatio(m.expenseRatio, lang)}` },
    });
  }
  if (m.topIncomeCategories.length > 0) {
    const top = m.topIncomeCategories[0];
    trxSuggestions.push({
      id: 'trx-focus-income-category',
      priority: 'medium',
      title: isFr
        ? `Développer la catégorie de revenus "${top.cat}"`
        : `Grow the "${top.cat}" income category`,
      description: isFr
        ? `"${top.cat}" est votre première source de revenus avec ${fmt(top.total)}. Concentrez vos efforts commerciaux sur cette catégorie pour maximiser la croissance.`
        : `"${top.cat}" is your top income source at ${fmt(top.total)}. Focus your commercial efforts on this category to maximize growth.`,
      impact: isFr
        ? `Augmenter ce segment de 20% apporterait environ ${fmt(top.total * 0.2)} de revenus supplémentaires`
        : `Growing this segment by 20% would bring approximately ${fmt(top.total * 0.2)} in additional revenue`,
      actionLabel: t.addTrx,
      actionLink: '/transactions',
      metric: { label: top.cat, value: fmt(top.total) },
    });
  }
  if (trxSuggestions.length === 0) {
    trxSuggestions.push({
      id: 'trx-record-income',
      priority: 'medium',
      title: isFr ? 'Enregistrer vos flux de revenus' : 'Record your income streams',
      description: isFr
        ? `Aucune transaction de revenus enregistrée. Documentez vos sources de revenus pour piloter votre stratégie de croissance.`
        : `No income transactions recorded. Document your income sources to guide your growth strategy.`,
      impact: isFr ? 'Permet d\'identifier les segments les plus rentables' : 'Enables identification of the most profitable segments',
      actionLabel: t.addTrx,
      actionLink: '/transactions',
      metric: null,
    });
  }

  sections.push({
    category: 'transactions',
    icon: 'swap_horiz',
    color: 'green',
    title: t.transactionsTitle,
    suggestions: trxSuggestions.slice(0, 3),
  });

  // 4. Assets
  const assetSuggestions = [];
  if (m.totalAssets < m.totalDebt && m.totalDebt > 0) {
    assetSuggestions.push({
      id: 'asset-acquire-productive',
      priority: 'high',
      title: isFr ? 'Acquérir des actifs générateurs de revenus' : 'Acquire revenue-generating assets',
      description: isFr
        ? `Vos actifs (${fmt(m.totalAssets)}) sont inférieurs à votre dette (${fmt(m.totalDebt)}). L'acquisition d'actifs productifs améliorera votre bilan et votre capacité de remboursement.`
        : `Your assets (${fmt(m.totalAssets)}) are below your debt (${fmt(m.totalDebt)}). Acquiring productive assets will improve your balance sheet and repayment capacity.`,
      impact: isFr
        ? `Améliore le ratio dette/actifs et renforce la solidité financière perçue par les créanciers`
        : `Improves the debt-to-asset ratio and strengthens financial credibility with lenders`,
      actionLabel: t.addAsset,
      actionLink: '/assets',
      metric: { label: t.debtRatio, value: `${fmtDebtRatio(m.debtToAsset, lang)}` },
    });
  } else if (m.totalAssets >= m.totalDebt || m.totalDebt === 0) {
    assetSuggestions.push({
      id: 'asset-leverage-existing',
      priority: 'low',
      title: isFr ? 'Valoriser les actifs existants' : 'Leverage existing assets',
      description: isFr
        ? `Vous disposez de ${fmt(m.totalAssets)} d'actifs. Évaluez comment les utiliser comme garantie pour obtenir un financement à moindre coût ou les louer pour générer des revenus passifs.`
        : `You hold ${fmt(m.totalAssets)} in assets. Evaluate how to use them as collateral for cheaper financing or rent them out for passive income.`,
      impact: isFr
        ? `Des actifs bien utilisés peuvent générer un rendement supplémentaire de 5 à 15%`
        : `Well-utilized assets can generate an additional 5–15% return`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: { label: t.totalAssets, value: fmt(m.totalAssets) },
    });
  }
  if (m.assets.length === 0) {
    assetSuggestions[0] = {
      id: 'asset-first',
      priority: 'medium',
      title: isFr ? 'Constituer un patrimoine d\'actifs' : 'Build an asset base',
      description: isFr
        ? `Aucun actif enregistré. L'acquisition d'actifs productifs (équipements, immobilier, brevets) est un levier clé de croissance durable.`
        : `No assets recorded. Acquiring productive assets (equipment, real estate, patents) is a key lever for sustainable growth.`,
      impact: isFr ? 'Renforce le bilan et la capacité d\'emprunt future' : 'Strengthens the balance sheet and future borrowing capacity',
      actionLabel: t.addAsset,
      actionLink: '/assets',
      metric: null,
    };
  }

  sections.push({
    category: 'assets',
    icon: 'apartment',
    color: 'orange',
    title: t.assetsTitle,
    suggestions: assetSuggestions,
  });

  const healthyForGrowth = m.cashFlow >= 0 && (m.debtToAsset === null || m.debtToAsset < 0.5) && (m.expenseRatio === null || m.expenseRatio < 0.7);
  const headline = isFr
    ? `Votre position financière actuelle (trésorerie : ${fmt(m.cashFlow)}, ratio dette/actifs : ${fmtDebtRatio(m.debtToAsset, 'fr')}) ${healthyForGrowth ? "offre une base solide pour la croissance" : "nécessite un assainissement avant d'accélérer"}. Concentrez-vous sur la récupération des ${fmt(m.lateInvoiceAmount)} de créances en retard pour libérer des liquidités. Un plan d'expansion structuré sur 6 à 12 mois peut significativement augmenter vos revenus.`
    : `Your current financial position (cash flow: ${fmt(m.cashFlow)}, debt-to-asset: ${fmtDebtRatio(m.debtToAsset, 'en')}) ${healthyForGrowth ? 'provides a solid foundation for growth' : 'requires stabilisation before accelerating'}. Focus on recovering ${fmt(m.lateInvoiceAmount)} in overdue receivables to free up liquidity. A structured 6–12 month expansion plan can significantly increase your revenues.`;

  // targetScore must reflect true financial health — penalise negative cashFlow and extreme expense ratio
  const targetScore = Math.max(25, 60
    - (m.lateRate > 20 ? 10 : 0)
    - (m.debtToAsset === null || m.debtToAsset > 0.6 ? 10 : 0)
    - (m.cashFlow < 0 ? 15 : 0)
    - (m.expenseRatio === null || m.expenseRatio > 1 ? 10 : 0)
  );

  return { sections, headline, targetScore, timeframe: isFr ? T.fr.tf_growth : T.en.tf_growth };
}

// ── STABILITY ────────────────────────────────────────────
function buildStability(m, lang) {
  const t = T[lang];
  const isFr = lang === 'fr';
  const sections = [];

  // 1. Invoices
  const invSuggestions = [];
  if (m.lateRate > 10) {
    invSuggestions.push({
      id: 'stab-inv-reduce-late',
      priority: 'high',
      title: isFr
        ? `Ramener le taux de retard sous 10% (actuellement ${r1(m.lateRate)}%)`
        : `Bring late rate below 10% (currently ${r1(m.lateRate)}%)`,
      description: isFr
        ? `${m.lateInvoiceCount} factures en retard pour ${fmt(m.lateInvoiceAmount)} fragilisent votre stabilité. Implémentez des rappels automatiques à J-7, J-1 et J+3 pour chaque échéance.`
        : `${m.lateInvoiceCount} overdue invoices totalling ${fmt(m.lateInvoiceAmount)} undermine your stability. Implement automatic reminders at D-7, D-1 and D+3 for each due date.`,
      impact: isFr
        ? `Réduire le taux de retard de ${r1(m.lateRate)}% à 10% libérerait environ ${fmt(m.lateInvoiceAmount * 0.5)} de trésorerie`
        : `Reducing the late rate from ${r1(m.lateRate)}% to 10% would free approximately ${fmt(m.lateInvoiceAmount * 0.5)} in cash`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.lateRate, value: `${r1(m.lateRate)}%` },
    });
  }
  invSuggestions.push({
    id: 'stab-inv-enforce-terms',
    priority: 'medium',
    title: isFr ? 'Standardiser les conditions de paiement' : 'Standardise payment terms',
    description: isFr
      ? `Appliquez des délais uniformes (30 jours maximum) à tous les clients. ${m.totalInvoices > 0 ? `Sur vos ${m.totalInvoices} factures, les délais variables créent des pics et creux de trésorerie.` : `Une politique claire dès le départ évite les disputes futures.`}`
      : `Apply uniform terms (30 days maximum) to all clients. ${m.totalInvoices > 0 ? `Across your ${m.totalInvoices} invoices, variable terms create cash flow peaks and troughs.` : `A clear policy from the start avoids future disputes.`}`,
    impact: isFr
      ? `Des délais standardisés réduisent l'imprévisibilité de la trésorerie de 20 à 30%`
      : `Standardised terms reduce cash flow unpredictability by 20–30%`,
    actionLabel: t.viewInvoices,
    actionLink: '/invoices',
    metric: { label: t.lateInvoices, value: `${m.lateInvoiceCount}` },
  });

  sections.push({ category: 'invoices', icon: 'receipt_long', color: 'blue', title: t.invoicesTitle, suggestions: invSuggestions.slice(0, 3) });

  // 2. Loans
  const loanSuggestions = [];
  loanSuggestions.push({
    id: 'stab-loan-no-new-debt',
    priority: m.debtToAsset > 0.5 ? 'high' : 'medium',
    title: isFr ? 'Éviter tout nouvel endettement' : 'Avoid new debt',
    description: isFr
      ? `En phase de stabilisation, contracter de nouveaux prêts augmente le risque. ${m.totalDebt > 0 ? `Votre dette actuelle de ${fmt(m.totalDebt)} représente ${fmtDebtRatio(m.debtToAsset, lang)} de vos actifs — maintenez ce niveau stable.` : `Aucune dette active : préservez cette position avantageuse.`}`
      : `In a stabilisation phase, taking on new debt increases risk. ${m.totalDebt > 0 ? `Your current debt of ${fmt(m.totalDebt)} represents ${fmtDebtRatio(m.debtToAsset, lang)} of your assets — keep this level stable.` : `No active debt: maintain this advantageous position.`}`,
    impact: isFr
      ? `Prévient la dégradation du ratio dette/actifs et maintient la flexibilité financière`
      : `Prevents deterioration of the debt-to-asset ratio and maintains financial flexibility`,
    actionLabel: t.viewLoans,
    actionLink: '/loans',
    metric: m.totalDebt > 0 ? { label: t.totalDebt, value: fmt(m.totalDebt) } : null,
  });
  if (m.monthlyPayments > 0) {
    loanSuggestions.push({
      id: 'stab-loan-maintain-payments',
      priority: 'medium',
      title: isFr ? 'Maintenir les paiements à date' : 'Maintain on-time payments',
      description: isFr
        ? `Vos mensualités totales sont de ${fmt(m.monthlyPayments)}. Planifier ces paiements dans votre trésorerie mensuelle évite les pénalités et préserve votre historique de crédit.`
        : `Your total monthly payments are ${fmt(m.monthlyPayments)}. Scheduling these payments in your monthly cash flow avoids penalties and preserves your credit history.`,
      impact: isFr
        ? `Un historique de paiement parfait améliore votre score de crédit et vos conditions de refinancement futures`
        : `A perfect payment history improves your credit score and future refinancing terms`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: t.monthlyPayments, value: fmt(m.monthlyPayments) },
    });
  }

  sections.push({ category: 'loans', icon: 'account_balance', color: 'purple', title: t.loansTitle, suggestions: loanSuggestions });

  // 3. Transactions
  const trxSuggestions = [];
  if (m.expenseRatio > 0.7 && m.income > 0) {
    trxSuggestions.push({
      id: 'stab-trx-cut-expenses',
      priority: 'high',
      title: isFr
        ? `Réduire le ratio de dépenses à 70% (actuellement ${fmtExpRatio(m.expenseRatio, lang)})`
        : `Reduce expense ratio to 70% (currently ${fmtExpRatio(m.expenseRatio, lang)})`,
      description: isFr
        ? `Vos dépenses représentent ${fmtExpRatio(m.expenseRatio, lang)} de vos revenus. ${m.topExpenseCategories.length > 0 ? `La catégorie la plus coûteuse est "${m.topExpenseCategories[0].cat}" avec ${fmt(m.topExpenseCategories[0].total)}.` : ''} Réduire à 70% économiserait ${fmt(m.income * (m.expenseRatio - 0.7))}.`
        : `Your expenses represent ${fmtExpRatio(m.expenseRatio, lang)} of revenues. ${m.topExpenseCategories.length > 0 ? `The costliest category is "${m.topExpenseCategories[0].cat}" at ${fmt(m.topExpenseCategories[0].total)}.` : ''} Reducing to 70% would save ${fmt(m.income * (m.expenseRatio - 0.7))}.`,
      impact: isFr
        ? `Libèrerait ${fmt(m.income * Math.max(0, m.expenseRatio - 0.7))} pour constituer une réserve de précaution`
        : `Would free ${fmt(m.income * Math.max(0, m.expenseRatio - 0.7))} to build a contingency reserve`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: t.expenseRatio, value: `${fmtExpRatio(m.expenseRatio, lang)}` },
    });
  } else {
    trxSuggestions.push({
      id: 'stab-trx-maintain-ratio',
      priority: 'low',
      title: isFr ? 'Maintenir le ratio de dépenses actuel' : 'Maintain current expense ratio',
      description: isFr
        ? `Votre ratio de ${fmtExpRatio(m.expenseRatio, lang)} est dans une zone saine. Continuez à monitorer mensuellement pour détecter toute dérive.`
        : `Your ratio of ${fmtExpRatio(m.expenseRatio, lang)} is in a healthy zone. Continue monitoring monthly to catch any drift.`,
      impact: isFr
        ? `Une discipline de dépenses stable est le fondement d'une entreprise résiliente`
        : `Stable spending discipline is the foundation of a resilient business`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: t.expenseRatio, value: `${fmtExpRatio(m.expenseRatio, lang)}` },
    });
  }
  trxSuggestions.push({
    id: 'stab-trx-reserve',
    priority: 'medium',
    title: isFr ? 'Constituer une réserve de 3 mois de charges' : 'Build a 3-month expense reserve',
    description: isFr
      ? `${m.monthlyExpenses > 0 ? `Vos charges mensuelles moyennes sont de ${fmt(m.monthlyExpenses)}. Une réserve cible de ${fmt(m.monthlyExpenses * 3)} vous protégera des imprévus.` : `Commencez à enregistrer vos dépenses pour calculer la réserve recommandée.`}`
      : `${m.monthlyExpenses > 0 ? `Your average monthly expenses are ${fmt(m.monthlyExpenses)}. A target reserve of ${fmt(m.monthlyExpenses * 3)} will protect you from unexpected costs.` : `Start recording expenses to calculate the recommended reserve.`}`,
    impact: isFr
      ? `Une réserve de trésorerie réduit le risque de défaut de paiement lors des périodes creuses`
      : `A cash reserve reduces default risk during slow periods`,
    actionLabel: t.addTrx,
    actionLink: '/transactions',
    metric: m.monthlyExpenses > 0 ? { label: isFr ? 'Réserve cible' : 'Target reserve', value: fmt(m.monthlyExpenses * 3) } : null,
  });

  sections.push({ category: 'transactions', icon: 'swap_horiz', color: 'green', title: t.transactionsTitle, suggestions: trxSuggestions });

  // 4. Assets
  sections.push({
    category: 'assets',
    icon: 'apartment',
    color: 'orange',
    title: t.assetsTitle,
    suggestions: [{
      id: 'stab-asset-maintain',
      priority: 'low',
      title: isFr ? 'Maintenir et entretenir les actifs existants' : 'Maintain and service existing assets',
      description: isFr
        ? `${m.assets.length > 0 ? `Vos ${m.assets.length} actifs valent ${fmt(m.totalAssets)}. Planifiez la maintenance préventive pour éviter les dépenses d'urgence qui perturbent la stabilité.` : `Aucun actif enregistré. Documentez vos actifs pour un suivi précis du bilan.`}`
        : `${m.assets.length > 0 ? `Your ${m.assets.length} assets are worth ${fmt(m.totalAssets)}. Plan preventive maintenance to avoid emergency costs that disrupt stability.` : `No assets recorded. Document your assets for accurate balance sheet tracking.`}`,
      impact: isFr
        ? `La maintenance préventive coûte en moyenne 3 fois moins que les réparations d'urgence`
        : `Preventive maintenance costs on average 3x less than emergency repairs`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: m.totalAssets > 0 ? { label: t.totalAssets, value: fmt(m.totalAssets) } : null,
    }],
  });

  const headline = isFr
    ? `Votre objectif de stabilisation requiert de contrôler le ratio de dépenses (actuellement ${fmtExpRatio(m.expenseRatio, lang)}) et de maintenir le taux de retard sous 10% (actuellement ${r1(m.lateRate)}%). Avec ${fmt(m.cashFlow)} de trésorerie nette et ${fmt(m.totalDebt)} de dette, la priorité est de consolider ces fondamentaux avant d'envisager une croissance.`
    : `Your stabilisation goal requires controlling the expense ratio (currently ${fmtExpRatio(m.expenseRatio, lang)}) and keeping the late rate below 10% (currently ${r1(m.lateRate)}%). With ${fmt(m.cashFlow)} in net cash flow and ${fmt(m.totalDebt)} in debt, the priority is consolidating these fundamentals before considering growth.`;

  const targetScore = Math.max(25, 45 - (m.lateRate > 15 ? 5 : 0) - (m.expenseRatio > 0.8 ? 5 : 0));
  return { sections, headline, targetScore, timeframe: isFr ? T.fr.tf_stability : T.en.tf_stability };
}

// ── DEBT REDUCTION ───────────────────────────────────────
function buildDebtReduction(m, lang) {
  const t = T[lang];
  const isFr = lang === 'fr';
  const sections = [];

  // 1. Loans (most important for this scenario)
  const loanSuggestions = [];
  if (m.loans.length === 0) {
    loanSuggestions.push({
      id: 'debt-no-loans',
      priority: 'low',
      title: isFr ? 'Aucune dette à réduire' : 'No debt to reduce',
      description: isFr
        ? `Vous n'avez aucun prêt enregistré. Votre situation financière est déjà libre de toute dette formelle.`
        : `You have no loans recorded. Your financial situation is already free of formal debt.`,
      impact: isFr ? 'Maintenez cette position pour une flexibilité financière maximale' : 'Maintain this position for maximum financial flexibility',
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: null,
    });
  } else {
    // Avalanche method: highest interest first
    const topRate = m.sortedLoansByRate[0];
    loanSuggestions.push({
      id: 'debt-avalanche-top',
      priority: 'critical',
      title: isFr
        ? `Méthode avalanche : prioriser le prêt à ${r1(topRate.interestRate)}% d'intérêt`
        : `Avalanche method: prioritise the ${r1(topRate.interestRate)}% interest loan`,
      description: isFr
        ? `Le prêt le plus coûteux a un taux de ${r1(topRate.interestRate)}% pour un capital de ${fmt(topRate.amount)}. Chaque mois de remboursement accéléré économise ${fmt((topRate.amount * topRate.interestRate / 100) / 12)} d'intérêts. Versez le maximum possible sur ce prêt en priorité.`
        : `The most expensive loan has a ${r1(topRate.interestRate)}% rate on a capital of ${fmt(topRate.amount)}. Each month of accelerated repayment saves ${fmt((topRate.amount * topRate.interestRate / 100) / 12)} in interest. Pay the maximum possible on this loan first.`,
      impact: isFr
        ? `Économie d'intérêts estimée : ${fmt((topRate.amount * topRate.interestRate / 100))} si remboursé avec 6 mois d'avance`
        : `Estimated interest saving: ${fmt((topRate.amount * topRate.interestRate / 100))} if repaid 6 months early`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: isFr ? 'Taux le plus élevé' : 'Highest rate', value: `${r1(topRate.interestRate)}% — ${fmt(topRate.amount)}` },
    });
    if (m.loans.length > 1) {
      loanSuggestions.push({
        id: 'debt-total-plan',
        priority: 'high',
        title: isFr
          ? `Plan de désendettement total : ${fmt(m.totalDebt)} sur ${m.loans.length} prêts`
          : `Total debt reduction plan: ${fmt(m.totalDebt)} across ${m.loans.length} loans`,
        description: isFr
          ? `Vos mensualités cumulées sont de ${fmt(m.monthlyPayments)}. En augmentant chaque paiement de 15% (soit ${fmt(m.monthlyPayments * 0.15)} de plus par mois), vous réduiriez la durée totale de remboursement de 20 à 30%.`
          : `Your total monthly payments are ${fmt(m.monthlyPayments)}. By increasing each payment by 15% (${fmt(m.monthlyPayments * 0.15)} extra per month), you would reduce the total repayment period by 20–30%.`,
        impact: isFr
          ? `Réduction de la durée d'endettement et des intérêts totaux payés`
          : `Reduced debt duration and total interest paid`,
        actionLabel: t.viewLoans,
        actionLink: '/loans',
        metric: { label: t.monthlyPayments, value: fmt(m.monthlyPayments) },
      });
    }
  }

  sections.push({ category: 'loans', icon: 'account_balance', color: 'red', title: t.loansTitle, suggestions: loanSuggestions });

  // 2. Invoices (collect to fund repayment)
  const invSuggestions = [];
  if (m.lateInvoiceAmount > 0) {
    invSuggestions.push({
      id: 'debt-inv-collect-aggressive',
      priority: 'critical',
      title: isFr
        ? `Recouvrer ${fmt(m.lateInvoiceAmount)} pour rembourser la dette`
        : `Collect ${fmt(m.lateInvoiceAmount)} to repay debt`,
      description: isFr
        ? `${m.lateInvoiceCount} factures en retard totalisent ${fmt(m.lateInvoiceAmount)} — une source immédiate de liquidités pour accélérer le désendettement. Lancez une procédure de recouvrement urgente sur toutes les créances de plus de 30 jours.`
        : `${m.lateInvoiceCount} overdue invoices total ${fmt(m.lateInvoiceAmount)} — an immediate source of funds to accelerate debt reduction. Launch an urgent collection process on all receivables over 30 days.`,
      impact: isFr
        ? `Récupérer ces fonds permettrait de rembourser ${fmt(Math.min(m.lateInvoiceAmount, m.totalDebt))} de dette`
        : `Recovering these funds would allow repaying ${fmt(Math.min(m.lateInvoiceAmount, m.totalDebt))} of debt`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.lateInvoices, value: `${m.lateInvoiceCount} (${fmt(m.lateInvoiceAmount)})` },
    });
  }
  invSuggestions.push({
    id: 'debt-inv-no-new-late',
    priority: 'medium',
    title: isFr ? 'Zéro tolérance pour les nouvelles factures en retard' : 'Zero tolerance for new late invoices',
    description: isFr
      ? `Chaque nouvelle facture impayée réduit les liquidités disponibles pour le remboursement. Exigez des acomptes de 30% à la commande pour les nouveaux clients.`
      : `Every new unpaid invoice reduces funds available for repayment. Require 30% upfront deposits for new clients.`,
    impact: isFr
      ? `Réduit le risque de créances douteuses et améliore la prévisibilité des remboursements`
      : `Reduces bad debt risk and improves repayment predictability`,
    actionLabel: t.addInvoice,
    actionLink: '/invoices',
    metric: null,
  });

  sections.push({ category: 'invoices', icon: 'receipt_long', color: 'blue', title: t.invoicesTitle, suggestions: invSuggestions });

  // 3. Transactions (cut expenses, redirect to debt)
  const trxSuggestions = [];
  if (m.topExpenseCategories.length > 0) {
    const topExp = m.topExpenseCategories[0];
    trxSuggestions.push({
      id: 'debt-trx-cut-top-expense',
      priority: 'high',
      title: isFr
        ? `Réduire les dépenses "${topExp.cat}" de 20%`
        : `Cut "${topExp.cat}" expenses by 20%`,
      description: isFr
        ? `"${topExp.cat}" est votre poste de dépense le plus important avec ${fmt(topExp.total)}. Une réduction de 20% libérerait ${fmt(topExp.total * 0.2)} à rediriger vers le remboursement de la dette.`
        : `"${topExp.cat}" is your largest expense at ${fmt(topExp.total)}. A 20% cut would free ${fmt(topExp.total * 0.2)} to redirect to debt repayment.`,
      impact: isFr
        ? `${fmt(topExp.total * 0.2)} supplémentaires vers le remboursement réduirait la dette plus rapidement`
        : `${fmt(topExp.total * 0.2)} extra towards repayment would reduce debt faster`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: topExp.cat, value: fmt(topExp.total) },
    });
  }
  trxSuggestions.push({
    id: 'debt-trx-redirect-surplus',
    priority: 'high',
    title: isFr ? 'Allouer 30% du surplus mensuel à la dette' : 'Allocate 30% of monthly surplus to debt',
    description: isFr
      ? `${m.cashFlow > 0 ? `Votre trésorerie nette est de ${fmt(m.cashFlow)}. Diriger ${fmt(m.cashFlow * 0.3)} par mois supplémentaire vers la dette réduirait significativement les intérêts totaux.` : `Votre trésorerie est négative (${fmt(m.cashFlow)}). La réduction des dépenses est prioritaire avant tout remboursement accéléré.`}`
      : `${m.cashFlow > 0 ? `Your net cash flow is ${fmt(m.cashFlow)}. Directing ${fmt(m.cashFlow * 0.3)} extra per month towards debt would significantly reduce total interest.` : `Your cash flow is negative (${fmt(m.cashFlow)}). Reducing expenses takes priority before any accelerated repayment.`}`,
    impact: isFr
      ? `Un versement mensuel supplémentaire de ${fmt(Math.max(0, m.cashFlow * 0.3))} peut réduire la durée totale de remboursement de 15 à 25%`
      : `An extra monthly payment of ${fmt(Math.max(0, m.cashFlow * 0.3))} can reduce total repayment duration by 15–25%`,
    actionLabel: t.viewTrx,
    actionLink: '/transactions',
    metric: { label: t.cashFlow, value: fmt(m.cashFlow) },
  });

  sections.push({ category: 'transactions', icon: 'swap_horiz', color: 'green', title: t.transactionsTitle, suggestions: trxSuggestions });

  // 4. Assets (consider liquidating low-value ones)
  const assetSuggestions = [];
  if (m.totalAssets > m.totalDebt * 1.5 && m.lowValueAssets.length > 0) {
    const lva = m.lowValueAssets[0];
    assetSuggestions.push({
      id: 'debt-asset-liquidate-low',
      priority: 'medium',
      title: isFr
        ? `Envisager la cession de l'actif "${lva.name}" (${fmt(lva.value)})`
        : `Consider selling asset "${lva.name}" (${fmt(lva.value)})`,
      description: isFr
        ? `Vos actifs (${fmt(m.totalAssets)}) dépassent largement votre dette (${fmt(m.totalDebt)}). La cession d'actifs peu productifs peut accélérer le désendettement sans compromettre l'exploitation.`
        : `Your assets (${fmt(m.totalAssets)}) significantly exceed your debt (${fmt(m.totalDebt)}). Selling underperforming assets can accelerate debt reduction without compromising operations.`,
      impact: isFr
        ? `La cession des actifs les moins performants pourrait apporter ${fmt(m.lowValueAssets.reduce((s, a) => s + a.value, 0))} de liquidités`
        : `Selling underperforming assets could bring ${fmt(m.lowValueAssets.reduce((s, a) => s + a.value, 0))} in cash`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: { label: lva.name, value: fmt(lva.value) },
    });
  } else {
    assetSuggestions.push({
      id: 'debt-asset-preserve',
      priority: 'low',
      title: isFr ? 'Préserver les actifs productifs' : 'Preserve productive assets',
      description: isFr
        ? `${m.totalAssets > 0 ? `Conservez vos ${m.assets.length} actifs (${fmt(m.totalAssets)}) sauf s'ils ne génèrent aucun revenu. Liquidez uniquement les actifs dormants.` : `Aucun actif enregistré. Documentez votre patrimoine pour une gestion optimale du bilan.`}`
        : `${m.totalAssets > 0 ? `Retain your ${m.assets.length} assets (${fmt(m.totalAssets)}) unless they generate no income. Only liquidate dormant assets.` : `No assets recorded. Document your wealth for optimal balance sheet management.`}`,
      impact: isFr
        ? `Les actifs productifs soutiennent la capacité de remboursement via les revenus qu'ils génèrent`
        : `Productive assets support repayment capacity via the income they generate`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: m.totalAssets > 0 ? { label: t.totalAssets, value: fmt(m.totalAssets) } : null,
    });
  }

  sections.push({ category: 'assets', icon: 'apartment', color: 'orange', title: t.assetsTitle, suggestions: assetSuggestions });

  const headline = isFr
    ? `Pour réduire votre dette de ${fmt(m.totalDebt)}, appliquez la méthode avalanche en priorisant le prêt à ${m.highestRateLoan ? r1(m.highestRateLoan.interestRate) + '%' : 'taux le plus élevé'}. Récupérez en urgence ${fmt(m.lateInvoiceAmount)} de créances impayées pour alimenter les remboursements. En maintenant cette discipline, un désendettement significatif est atteignable en 12 à 24 mois.`
    : `To reduce your debt of ${fmt(m.totalDebt)}, apply the avalanche method by prioritising the ${m.highestRateLoan ? r1(m.highestRateLoan.interestRate) + '%' : 'highest rate'} loan. Urgently recover ${fmt(m.lateInvoiceAmount)} in unpaid receivables to fund repayments. With this discipline, significant debt reduction is achievable in 12–24 months.`;

  const targetScore = Math.max(20, 50 - (m.debtToAsset > 0.7 ? 15 : 0) - (m.lateRate > 20 ? 10 : 0));
  return { sections, headline, targetScore, timeframe: isFr ? T.fr.tf_debt : T.en.tf_debt };
}

// ── REVENUE OPTIMIZATION ──────────────────────────────────
function buildRevenueOptimization(m, lang) {
  const t = T[lang];
  const isFr = lang === 'fr';
  const sections = [];

  // 1. Invoices: top clients, collection rate
  const invSuggestions = [];
  if (m.topClients.length > 0) {
    const tc = m.topClients[0];
    invSuggestions.push({
      id: 'rev-inv-top-client',
      priority: 'high',
      title: isFr
        ? `Développer le compte client "${tc.name}" (${fmt(tc.total)})`
        : `Grow client account "${tc.name}" (${fmt(tc.total)})`,
      description: isFr
        ? `"${tc.name}" est votre meilleur client avec ${fmt(tc.total)} de facturation sur ${tc.count} facture(s). Proposez-lui des services additionnels ou des contrats à long terme pour sécuriser et augmenter ce revenu.`
        : `"${tc.name}" is your top client with ${fmt(tc.total)} in billing across ${tc.count} invoice(s). Offer additional services or long-term contracts to secure and grow this revenue.`,
      impact: isFr
        ? `Une augmentation de 15% du compte "${tc.name}" rapporterait ${fmt(tc.total * 0.15)} supplémentaires`
        : `A 15% increase in the "${tc.name}" account would bring ${fmt(tc.total * 0.15)} extra`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: isFr ? 'Top client' : 'Top client', value: `${tc.name} — ${fmt(tc.total)}` },
    });
  }
  if (m.lateRate > 5) {
    invSuggestions.push({
      id: 'rev-inv-improve-collection',
      priority: 'medium',
      title: isFr
        ? `Améliorer le taux de recouvrement (${r1(m.lateRate)}% de retard)`
        : `Improve collection rate (${r1(m.lateRate)}% late)`,
      description: isFr
        ? `${fmt(m.unpaidAmount)} de revenus facturés ne sont pas encore encaissés. Chaque jour de retard réduit votre rentabilité réelle. Un système de relance en 3 étapes (J+0, J+7, J+15) peut réduire ce montant de moitié.`
        : `${fmt(m.unpaidAmount)} of invoiced revenues are not yet collected. Every day of delay reduces your actual profitability. A 3-step follow-up system (D+0, D+7, D+15) can halve this amount.`,
      impact: isFr
        ? `Réduire le taux de retard à 5% libérerait environ ${fmt(m.unpaidAmount * 0.5)} de trésorerie supplémentaire`
        : `Reducing the late rate to 5% would free approximately ${fmt(m.unpaidAmount * 0.5)} in additional cash`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.unpaidAmount, value: fmt(m.unpaidAmount) },
    });
  }
  if (invSuggestions.length < 2) {
    invSuggestions.push({
      id: 'rev-inv-diversify',
      priority: 'medium',
      title: isFr ? 'Diversifier le portefeuille client' : 'Diversify the client portfolio',
      description: isFr
        ? `${m.totalInvoices > 0 ? `Avec ${m.totalInvoices} factures, réduisez la dépendance à vos principaux clients en développant de nouveaux comptes.` : `Commencez à facturer de nouveaux clients pour bâtir un portefeuille diversifié.`}`
        : `${m.totalInvoices > 0 ? `With ${m.totalInvoices} invoices, reduce dependency on top clients by developing new accounts.` : `Start invoicing new clients to build a diversified portfolio.`}`,
      impact: isFr
        ? `La diversification réduit le risque de concentration et améliore la stabilité des revenus`
        : `Diversification reduces concentration risk and improves revenue stability`,
      actionLabel: t.addInvoice,
      actionLink: '/invoices',
      metric: null,
    });
  }

  sections.push({ category: 'invoices', icon: 'receipt_long', color: 'blue', title: t.invoicesTitle, suggestions: invSuggestions.slice(0, 3) });

  // 2. Transactions: top income categories
  const trxSuggestions = [];
  if (m.topIncomeCategories.length > 0) {
    const topInc = m.topIncomeCategories[0];
    trxSuggestions.push({
      id: 'rev-trx-top-income',
      priority: 'high',
      title: isFr
        ? `Maximiser la catégorie de revenus "${topInc.cat}"`
        : `Maximise the "${topInc.cat}" income category`,
      description: isFr
        ? `"${topInc.cat}" génère ${fmt(topInc.total)} de revenus — votre source principale. Concentrez vos ressources commerciales sur cette catégorie pour en exploiter pleinement le potentiel.`
        : `"${topInc.cat}" generates ${fmt(topInc.total)} in revenue — your main source. Focus your commercial resources on this category to fully exploit its potential.`,
      impact: isFr
        ? `Augmenter ce segment de 25% rapporterait ${fmt(topInc.total * 0.25)} de revenus supplémentaires`
        : `Growing this segment by 25% would bring ${fmt(topInc.total * 0.25)} in additional revenue`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: topInc.cat, value: fmt(topInc.total) },
    });
  }
  if (m.income > 0 && m.expenseRatio < 0.8) {
    trxSuggestions.push({
      id: 'rev-trx-margin-optimize',
      priority: 'medium',
      title: isFr ? 'Optimiser la marge bénéficiaire nette' : 'Optimise net profit margin',
      description: isFr
        ? `Avec un ratio de ${fmtExpRatio(m.expenseRatio, lang)}, votre marge est de ${m.expenseRatio !== null ? r1((1 - m.expenseRatio) * 100) + '%' : 'N/A'}. ${m.topExpenseCategories.length > 0 ? `Réduire "${m.topExpenseCategories[0].cat}" (${fmt(m.topExpenseCategories[0].total)}) augmenterait directement cette marge.` : ''}`
        : `With a ratio of ${fmtExpRatio(m.expenseRatio, lang)}, your margin is ${m.expenseRatio !== null ? r1((1 - m.expenseRatio) * 100) + '%' : 'N/A'}. ${m.topExpenseCategories.length > 0 ? `Reducing "${m.topExpenseCategories[0].cat}" (${fmt(m.topExpenseCategories[0].total)}) would directly increase this margin.` : ''}`,
      impact: isFr
        ? `Chaque point de marge gagné sur ${fmt(m.income)} de revenus représente ${fmt(m.income * 0.01)}`
        : `Each margin point gained on ${fmt(m.income)} in revenue represents ${fmt(m.income * 0.01)}`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: isFr ? 'Marge nette' : 'Net margin', value: `${m.expenseRatio !== null ? r1((1 - m.expenseRatio) * 100) + '%' : 'N/A'}` },
    });
  }
  if (trxSuggestions.length === 0) {
    trxSuggestions.push({
      id: 'rev-trx-track',
      priority: 'medium',
      title: isFr ? 'Suivre toutes les sources de revenus' : 'Track all income sources',
      description: isFr
        ? `Enregistrez chaque transaction de revenu par catégorie pour identifier vos segments les plus rentables.`
        : `Record every income transaction by category to identify your most profitable segments.`,
      impact: isFr ? 'L\'analyse par catégorie permet de concentrer les efforts sur les sources à plus forte valeur' : 'Category analysis enables focus on highest-value sources',
      actionLabel: t.addTrx,
      actionLink: '/transactions',
      metric: null,
    });
  }

  sections.push({ category: 'transactions', icon: 'swap_horiz', color: 'green', title: t.transactionsTitle, suggestions: trxSuggestions.slice(0, 3) });

  // 3. Loans: refinance if high rate
  const loanSuggestions = [];
  if (m.avgInterestRate > 10 && m.loans.length > 0) {
    loanSuggestions.push({
      id: 'rev-loan-refinance',
      priority: 'high',
      title: isFr
        ? `Refinancer les prêts à taux élevé (taux moyen : ${r1(m.avgInterestRate)}%)`
        : `Refinance high-rate loans (average rate: ${r1(m.avgInterestRate)}%)`,
      description: isFr
        ? `Votre taux moyen de ${r1(m.avgInterestRate)}% est élevé. Négocier un refinancement à 8% sur ${fmt(m.totalDebt)} économiserait ${fmt(m.totalDebt * (m.avgInterestRate - 8) / 100)} d'intérêts par an, directement convertibles en revenus.`
        : `Your average rate of ${r1(m.avgInterestRate)}% is high. Negotiating a refinancing at 8% on ${fmt(m.totalDebt)} would save ${fmt(m.totalDebt * (m.avgInterestRate - 8) / 100)} in annual interest, directly convertible to revenue.`,
      impact: isFr
        ? `Économie annuelle estimée : ${fmt(m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100)}`
        : `Estimated annual saving: ${fmt(m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100)}`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: isFr ? 'Taux moyen actuel' : 'Current average rate', value: `${r1(m.avgInterestRate)}%` },
    });
  } else if (m.loans.length > 0) {
    loanSuggestions.push({
      id: 'rev-loan-ok',
      priority: 'low',
      title: isFr ? 'Taux de prêts acceptables' : 'Acceptable loan rates',
      description: isFr
        ? `Votre taux moyen de ${r1(m.avgInterestRate)}% est raisonnable. Réévaluez lors du prochain renouvellement si les taux du marché baissent.`
        : `Your average rate of ${r1(m.avgInterestRate)}% is reasonable. Re-evaluate at the next renewal if market rates drop.`,
      impact: isFr ? 'Surveiller les opportunités de marché pour optimiser le coût du capital' : 'Monitor market opportunities to optimise the cost of capital',
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: t.monthlyPayments, value: fmt(m.monthlyPayments) },
    });
  } else {
    loanSuggestions.push({
      id: 'rev-loan-none',
      priority: 'low',
      title: isFr ? 'Évaluer un financement à effet de levier' : 'Evaluate leveraged financing',
      description: isFr
        ? `Sans dette, votre coût du capital est entièrement supporté par les fonds propres. Un financement partiel par prêt peut optimiser le retour sur capitaux propres.`
        : `Without debt, your cost of capital is entirely equity-funded. Partial loan financing can optimise return on equity.`,
      impact: isFr ? 'L\'effet de levier peut améliorer le ROE si le taux d\'emprunt est inférieur au ROCE' : 'Leverage can improve ROE if the borrowing rate is below ROCE',
      actionLabel: t.addLoan,
      actionLink: '/loans',
      metric: null,
    });
  }

  sections.push({ category: 'loans', icon: 'account_balance', color: 'purple', title: t.loansTitle, suggestions: loanSuggestions });

  // 4. Assets: leverage for revenue
  sections.push({
    category: 'assets',
    icon: 'apartment',
    color: 'orange',
    title: t.assetsTitle,
    suggestions: [{
      id: 'rev-asset-leverage',
      priority: 'medium',
      title: isFr ? 'Monétiser les actifs existants' : 'Monetise existing assets',
      description: isFr
        ? `${m.totalAssets > 0 ? `Vos ${m.assets.length} actifs valent ${fmt(m.totalAssets)}. Évaluez s'ils peuvent générer des revenus directs (location, sous-traitance, licence).` : `Enregistrez vos actifs pour identifier des opportunités de monétisation.`}`
        : `${m.totalAssets > 0 ? `Your ${m.assets.length} assets are worth ${fmt(m.totalAssets)}. Evaluate whether they can generate direct revenue (rental, subcontracting, licensing).` : `Record your assets to identify monetisation opportunities.`}`,
      impact: isFr
        ? `Des actifs monétisés peuvent générer un rendement passif de 3 à 10% de leur valeur par an`
        : `Monetised assets can generate a passive return of 3–10% of their value per year`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: m.totalAssets > 0 ? { label: t.totalAssets, value: fmt(m.totalAssets) } : null,
    }],
  });

  const headline = isFr
    ? `Votre potentiel d'optimisation des revenus est concret : ${m.topIncomeCategories.length > 0 ? `"${m.topIncomeCategories[0].cat}" génère déjà ${fmt(m.topIncomeCategories[0].total)}` : 'identifiez vos meilleures sources de revenus'}. Récupérez ${fmt(m.unpaidAmount)} de créances en attente pour améliorer la trésorerie disponible. Un focus sur vos meilleurs clients et le refinancement potentiel de votre dette peut libérer ${fmt(m.monthlyPayments > 0 ? m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100 : 0)} par an.`
    : `Your revenue optimisation potential is concrete: ${m.topIncomeCategories.length > 0 ? `"${m.topIncomeCategories[0].cat}" already generates ${fmt(m.topIncomeCategories[0].total)}` : 'identify your best income sources'}. Recover ${fmt(m.unpaidAmount)} in outstanding receivables to improve available cash flow. Focusing on your best clients and potential debt refinancing can free ${fmt(m.monthlyPayments > 0 ? m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100 : 0)} per year.`;

  const targetScore = Math.max(20, 40 - (m.lateRate > 15 ? 8 : 0) - (m.avgInterestRate > 12 ? 8 : 0));
  return { sections, headline, targetScore, timeframe: isFr ? T.fr.tf_revenue : T.en.tf_revenue };
}

// ── RECOVERY ─────────────────────────────────────────────
function buildRecovery(m, lang) {
  const t = T[lang];
  const isFr = lang === 'fr';
  const sections = [];

  // 1. Invoices — critical, all late = immediate action
  const invSuggestions = [];
  if (m.lateInvoiceCount > 0) {
    invSuggestions.push({
      id: 'rec-inv-emergency-collect',
      priority: 'critical',
      title: isFr
        ? `ACTION URGENTE : Recouvrer ${fmt(m.lateInvoiceAmount)} de créances en retard`
        : `URGENT ACTION: Recover ${fmt(m.lateInvoiceAmount)} in overdue receivables`,
      description: isFr
        ? `${m.lateInvoiceCount} factures en retard totalisent ${fmt(m.lateInvoiceAmount)}. Contactez immédiatement chaque client débiteur. Envisagez une remise de 5 à 10% pour paiement sous 48h afin de récupérer rapidement des liquidités.`
        : `${m.lateInvoiceCount} overdue invoices total ${fmt(m.lateInvoiceAmount)}. Contact each debtor immediately. Consider a 5–10% discount for payment within 48h to quickly recover liquidity.`,
      impact: isFr
        ? `Récupération urgente estimée : ${fmt(m.lateInvoiceAmount * 0.9)} (après remise éventuelle de 10%)`
        : `Estimated urgent recovery: ${fmt(m.lateInvoiceAmount * 0.9)} (after potential 10% discount)`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.lateInvoices, value: `${m.lateInvoiceCount} (${fmt(m.lateInvoiceAmount)})` },
    });
  }
  invSuggestions.push({
    id: 'rec-inv-freeze-credit',
    priority: 'critical',
    title: isFr ? 'Suspendre les délais de paiement pour les nouveaux clients' : 'Suspend payment terms for new clients',
    description: isFr
      ? `En phase de redressement, n'accordez plus de délais de paiement. Exigez le paiement comptant ou 50% d'acompte sur toutes les nouvelles commandes.`
      : `In a recovery phase, no longer grant payment terms. Require cash payment or 50% deposit on all new orders.`,
    impact: isFr
      ? `Élimine le risque de nouvelles créances douteuses pendant la période critique`
      : `Eliminates the risk of new bad debts during the critical period`,
    actionLabel: t.viewInvoices,
    actionLink: '/invoices',
    metric: null,
  });

  sections.push({ category: 'invoices', icon: 'receipt_long', color: 'red', title: t.invoicesTitle, suggestions: invSuggestions });

  // 2. Loans — renegotiate if payments > 40% income
  const loanSuggestions = [];
  if (m.paymentToIncome > 40 && m.monthlyIncome > 0) {
    loanSuggestions.push({
      id: 'rec-loan-renegotiate',
      priority: 'critical',
      title: isFr
        ? `URGENT : Renégocier les prêts (mensualités = ${r1(m.paymentToIncome)}% des revenus)`
        : `URGENT: Renegotiate loans (payments = ${r1(m.paymentToIncome)}% of income)`,
      description: isFr
        ? `Vos mensualités de ${fmt(m.monthlyPayments)} représentent ${r1(m.paymentToIncome)}% de votre revenu mensuel moyen (${fmt(m.monthlyIncome)}). Contactez vos créanciers pour obtenir un moratoire de 3 à 6 mois ou un étalement de la dette.`
        : `Your monthly payments of ${fmt(m.monthlyPayments)} represent ${r1(m.paymentToIncome)}% of your average monthly income (${fmt(m.monthlyIncome)}). Contact your lenders to obtain a 3–6 month moratorium or debt rescheduling.`,
      impact: isFr
        ? `Un moratoire de 6 mois libérerait ${fmt(m.monthlyPayments * 6)} de trésorerie immédiate`
        : `A 6-month moratorium would free ${fmt(m.monthlyPayments * 6)} in immediate cash`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: t.monthlyPayments, value: `${fmt(m.monthlyPayments)} (${r1(m.paymentToIncome)}% revenus)` },
    });
  } else if (m.loans.length > 0) {
    loanSuggestions.push({
      id: 'rec-loan-monitor',
      priority: 'high',
      title: isFr ? 'Surveiller la capacité de remboursement' : 'Monitor repayment capacity',
      description: isFr
        ? `Vos mensualités de ${fmt(m.monthlyPayments)} sont actuellement gérables. En phase de redressement, tout arrêt de paiement aurait un impact catastrophique sur votre cote de crédit.`
        : `Your monthly payments of ${fmt(m.monthlyPayments)} are currently manageable. In a recovery phase, any payment default would have a catastrophic impact on your credit rating.`,
      impact: isFr
        ? `Maintenir un historique de paiement parfait est critique pour accéder à de futurs financements`
        : `Maintaining a perfect payment history is critical to accessing future financing`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: t.monthlyPayments, value: fmt(m.monthlyPayments) },
    });
  } else {
    loanSuggestions.push({
      id: 'rec-loan-avoid',
      priority: 'high',
      title: isFr ? 'Éviter tout nouvel emprunt en phase de redressement' : 'Avoid any new borrowing in recovery phase',
      description: isFr
        ? `Aucun prêt actif. En phase de redressement, ne contractez aucune nouvelle dette sans un plan de remboursement solide.`
        : `No active loans. In a recovery phase, do not take on any new debt without a solid repayment plan.`,
      impact: isFr ? 'Prévient l\'aggravation de la situation financière' : 'Prevents worsening of the financial situation',
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: null,
    });
  }

  sections.push({ category: 'loans', icon: 'account_balance', color: 'red', title: t.loansTitle, suggestions: loanSuggestions });

  // 3. Transactions — emergency cuts if cashFlow < 0
  const trxSuggestions = [];
  if (m.cashFlow < 0) {
    trxSuggestions.push({
      id: 'rec-trx-emergency-cut',
      priority: 'critical',
      title: isFr
        ? `CRITIQUE : Réduire les dépenses immédiatement (trésorerie : ${fmt(m.cashFlow)})`
        : `CRITICAL: Cut expenses immediately (cash flow: ${fmt(m.cashFlow)})`,
      description: isFr
        ? `Votre trésorerie est négative de ${fmt(Math.abs(m.cashFlow))}. ${m.topExpenseCategories.length > 0 ? `Commencez par réduire "${m.topExpenseCategories[0].cat}" (${fmt(m.topExpenseCategories[0].total)}) — votre poste de dépense le plus lourd.` : 'Identifiez et suspendez immédiatement toutes les dépenses non essentielles.'} Stoppez tout achat non critique.`
        : `Your cash flow is negative by ${fmt(Math.abs(m.cashFlow))}. ${m.topExpenseCategories.length > 0 ? `Start by cutting "${m.topExpenseCategories[0].cat}" (${fmt(m.topExpenseCategories[0].total)}) — your heaviest expense.` : 'Identify and immediately suspend all non-essential expenses.'} Stop all non-critical purchases.`,
      impact: isFr
        ? `Chaque ${fmt(1000)} de dépense évitée réduit directement le déficit de trésorerie`
        : `Every ${fmt(1000)} in avoided spending directly reduces the cash deficit`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: t.cashFlow, value: fmt(m.cashFlow) },
    });
  }
  if (m.topExpenseCategories.length > 0) {
    const worst = m.topExpenseCategories[0];
    trxSuggestions.push({
      id: 'rec-trx-cut-biggest',
      priority: 'critical',
      title: isFr
        ? `Réduire "${worst.cat}" de 30% minimum`
        : `Cut "${worst.cat}" by at least 30%`,
      description: isFr
        ? `"${worst.cat}" est votre plus grosse dépense avec ${fmt(worst.total)}. Une réduction de 30% économiserait ${fmt(worst.total * 0.3)} — à rediriger en priorité vers les remboursements urgents.`
        : `"${worst.cat}" is your largest expense at ${fmt(worst.total)}. A 30% reduction would save ${fmt(worst.total * 0.3)} — to be redirected towards urgent payments.`,
      impact: isFr
        ? `Économie immédiate estimée : ${fmt(worst.total * 0.3)}`
        : `Estimated immediate saving: ${fmt(worst.total * 0.3)}`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: worst.cat, value: fmt(worst.total) },
    });
  }
  if (trxSuggestions.length === 0) {
    trxSuggestions.push({
      id: 'rec-trx-audit',
      priority: 'critical',
      title: isFr ? 'Auditer toutes les dépenses immédiatement' : 'Audit all expenses immediately',
      description: isFr
        ? `Aucune transaction enregistrée. Documentez immédiatement toutes vos dépenses pour identifier les leviers de réduction.`
        : `No transactions recorded. Immediately document all expenses to identify reduction levers.`,
      impact: isFr ? 'Sans visibilité, aucune décision de redressement ne peut être prise' : 'Without visibility, no recovery decisions can be made',
      actionLabel: t.addTrx,
      actionLink: '/transactions',
      metric: null,
    });
  }

  sections.push({ category: 'transactions', icon: 'swap_horiz', color: 'red', title: t.transactionsTitle, suggestions: trxSuggestions.slice(0, 3) });

  // 4. Assets — emergency liquidity
  sections.push({
    category: 'assets',
    icon: 'apartment',
    color: 'red',
    title: t.assetsTitle,
    suggestions: [{
      id: 'rec-asset-liquidity',
      priority: 'critical',
      title: isFr ? 'Évaluer les options de liquidité d\'urgence sur les actifs' : 'Evaluate emergency liquidity options on assets',
      description: isFr
        ? `${m.totalAssets > 0 ? `Vos actifs représentent ${fmt(m.totalAssets)}. En situation de redressement, envisagez le nantissement ou la cession d'actifs non essentiels pour générer des liquidités immédiates.` : `Aucun actif disponible pour une liquidité d\'urgence. Concentrez-vous sur la réduction des dépenses et le recouvrement des créances.`}`
        : `${m.totalAssets > 0 ? `Your assets represent ${fmt(m.totalAssets)}. In a recovery situation, consider pledging or selling non-essential assets to generate immediate liquidity.` : `No assets available for emergency liquidity. Focus on expense reduction and receivables collection.`}`,
      impact: isFr
        ? `Des actifs liquidables peuvent fournir des fonds d'urgence sans passer par un emprunt`
        : `Liquidatable assets can provide emergency funds without resorting to borrowing`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: m.totalAssets > 0 ? { label: t.totalAssets, value: fmt(m.totalAssets) } : null,
    }],
  });

  const headline = isFr
    ? `Situation de redressement d'urgence : trésorerie ${fmt(m.cashFlow)}, ${m.lateInvoiceCount} factures en retard (${fmt(m.lateInvoiceAmount)}), mensualités à ${r1(m.paymentToIncome)}% des revenus. Priorisez le recouvrement immédiat des créances et la réduction des dépenses non essentielles. Chaque jour compte — agissez dans les 72 heures sur les leviers les plus critiques.`
    : `Emergency recovery situation: cash flow ${fmt(m.cashFlow)}, ${m.lateInvoiceCount} overdue invoices (${fmt(m.lateInvoiceAmount)}), monthly payments at ${r1(m.paymentToIncome)}% of income. Prioritise immediate receivables collection and non-essential expense reduction. Every day counts — act within 72 hours on the most critical levers.`;

  const targetScore = Math.max(30, 65 - (m.cashFlow < 0 ? 10 : 0) - (m.lateRate > 20 ? 10 : 0) - (m.paymentToIncome > 40 ? 10 : 0));
  return { sections, headline, targetScore, timeframe: isFr ? T.fr.tf_recovery : T.en.tf_recovery };
}

// ── EXCELLENCE ───────────────────────────────────────────
function buildExcellence(m, lang) {
  const t = T[lang];
  const isFr = lang === 'fr';
  const sections = [];

  // 1. Invoices — only flag genuinely suboptimal
  const invSuggestions = [];
  if (m.lateRate > 5) {
    invSuggestions.push({
      id: 'exc-inv-late',
      priority: m.lateRate > 15 ? 'high' : 'medium',
      title: isFr
        ? `Viser un taux de retard ≤ 5% (actuellement ${r1(m.lateRate)}%)`
        : `Target late rate ≤ 5% (currently ${r1(m.lateRate)}%)`,
      description: isFr
        ? `Les entreprises d'excellence maintiennent un taux de retard inférieur à 5%. Avec ${m.lateInvoiceCount} factures en retard (${fmt(m.lateInvoiceAmount)}), il reste ${r1(m.lateRate - 5)}% à optimiser.`
        : `Excellent companies maintain a late rate below 5%. With ${m.lateInvoiceCount} overdue invoices (${fmt(m.lateInvoiceAmount)}), there is ${r1(m.lateRate - 5)}% left to optimise.`,
      impact: isFr
        ? `Atteindre 5% de retard libérerait environ ${fmt(m.lateInvoiceAmount * (m.lateRate - 5) / m.lateRate)} de trésorerie`
        : `Reaching 5% late rate would free approximately ${fmt(m.lateInvoiceAmount * (m.lateRate - 5) / m.lateRate)} in cash`,
      actionLabel: t.viewInvoices,
      actionLink: '/invoices',
      metric: { label: t.lateRate, value: `${r1(m.lateRate)}%` },
    });
  }
  invSuggestions.push({
    id: 'exc-inv-kpi',
    priority: 'low',
    title: isFr ? 'Mettre en place des KPIs de facturation mensuels' : 'Implement monthly invoicing KPIs',
    description: isFr
      ? `Suivez mensuellement : DSO (Days Sales Outstanding), taux de recouvrement à 30/60/90 jours, et valeur moyenne des factures. ${m.totalInvoices > 0 ? `Sur ${m.totalInvoices} factures, votre montant moyen est de ${fmt(m.invoiceRevenue / m.totalInvoices)}.` : ''}`
      : `Track monthly: DSO (Days Sales Outstanding), collection rate at 30/60/90 days, and average invoice value. ${m.totalInvoices > 0 ? `Across ${m.totalInvoices} invoices, your average amount is ${fmt(m.invoiceRevenue / m.totalInvoices)}.` : ''}`,
    impact: isFr
      ? `Les KPIs permettent de détecter les dérives dès le premier mois et d'ajuster rapidement`
      : `KPIs allow detecting drifts from the first month and adjusting quickly`,
    actionLabel: t.viewInvoices,
    actionLink: '/invoices',
    metric: m.totalInvoices > 0 ? { label: isFr ? 'Montant moyen facture' : 'Avg invoice amount', value: fmt(m.invoiceRevenue / m.totalInvoices) } : null,
  });

  sections.push({ category: 'invoices', icon: 'receipt_long', color: 'blue', title: t.invoicesTitle, suggestions: invSuggestions });

  // 2. Loans — balanced view
  const loanSuggestions = [];
  if (m.avgInterestRate > 8 && m.loans.length > 0) {
    loanSuggestions.push({
      id: 'exc-loan-rate',
      priority: 'medium',
      title: isFr
        ? `Optimiser le coût du capital (taux moyen ${r1(m.avgInterestRate)}%)`
        : `Optimise cost of capital (average rate ${r1(m.avgInterestRate)}%)`,
      description: isFr
        ? `Les entreprises d'excellence maintiennent leur coût de la dette sous 8%. Négociez un refinancement de ${fmt(m.totalDebt)} pour réduire les intérêts annuels de ${fmt(m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100)}.`
        : `Excellent companies keep their cost of debt below 8%. Negotiate a refinancing of ${fmt(m.totalDebt)} to reduce annual interest by ${fmt(m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100)}.`,
      impact: isFr
        ? `Économie annuelle de ${fmt(m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100)} si le taux est réduit à 8%`
        : `Annual saving of ${fmt(m.totalDebt * Math.max(0, m.avgInterestRate - 8) / 100)} if rate is reduced to 8%`,
      actionLabel: t.viewLoans,
      actionLink: '/loans',
      metric: { label: isFr ? 'Taux moyen' : 'Average rate', value: `${r1(m.avgInterestRate)}%` },
    });
  }
  loanSuggestions.push({
    id: 'exc-loan-structure',
    priority: 'low',
    title: isFr ? 'Optimiser la structure de la dette' : 'Optimise debt structure',
    description: isFr
      ? `${m.loans.length > 0 ? `Avec ${m.loans.length} prêt(s) actif(s) et un ratio dette/actifs de ${fmtDebtRatio(m.debtToAsset, lang)}, évaluez annuellement si la structure de financement est optimale pour votre stade de développement.` : 'Aucune dette active — évaluez si un financement partiel par levier améliorerait le retour sur capitaux propres.'}`
      : `${m.loans.length > 0 ? `With ${m.loans.length} active loan(s) and a debt-to-asset ratio of ${fmtDebtRatio(m.debtToAsset, lang)}, evaluate annually whether the financing structure is optimal for your development stage.` : 'No active debt — evaluate whether partial leverage financing would improve return on equity.'}`,
    impact: isFr
      ? `Une structure de capital optimisée réduit le coût moyen pondéré du capital (WACC)`
      : `An optimised capital structure reduces the weighted average cost of capital (WACC)`,
    actionLabel: t.viewLoans,
    actionLink: '/loans',
    metric: m.totalDebt > 0 ? { label: t.debtRatio, value: `${fmtDebtRatio(m.debtToAsset, lang)}` } : null,
  });

  sections.push({ category: 'loans', icon: 'account_balance', color: 'purple', title: t.loansTitle, suggestions: loanSuggestions });

  // 3. Transactions — balanced
  const trxSuggestions = [];
  if (m.expenseRatio > 0.65 && m.income > 0) {
    trxSuggestions.push({
      id: 'exc-trx-ratio',
      priority: 'medium',
      title: isFr
        ? `Viser un ratio de dépenses ≤ 65% (actuellement ${fmtExpRatio(m.expenseRatio, lang)})`
        : `Target expense ratio ≤ 65% (currently ${fmtExpRatio(m.expenseRatio, lang)})`,
      description: isFr
        ? `L'excellence opérationnelle vise une marge brute de 35%+. Avec ${m.expenseRatio !== null ? r1((1 - m.expenseRatio) * 100) + '%' : 'N/A'} de marge actuelle, une optimisation de ${r1(m.expenseRatio * 100 - 65)}% est nécessaire, soit ${fmt(m.income * (m.expenseRatio - 0.65))} de dépenses à réduire.`
        : `Operational excellence targets 35%+ gross margin. With your current ${m.expenseRatio !== null ? r1((1 - m.expenseRatio) * 100) + '%' : 'N/A'} margin, a ${r1(m.expenseRatio * 100 - 65)}% optimisation is needed — ${fmt(m.income * (m.expenseRatio - 0.65))} in expenses to reduce.`,
      impact: isFr
        ? `Atteindre 65% améliorerait la marge de ${fmt(m.income * Math.max(0, m.expenseRatio - 0.65))}`
        : `Reaching 65% would improve margin by ${fmt(m.income * Math.max(0, m.expenseRatio - 0.65))}`,
      actionLabel: t.viewTrx,
      actionLink: '/transactions',
      metric: { label: t.expenseRatio, value: `${fmtExpRatio(m.expenseRatio, lang)}` },
    });
  }
  trxSuggestions.push({
    id: 'exc-trx-benchmark',
    priority: 'low',
    title: isFr ? 'Comparer les ratios aux standards sectoriels' : 'Benchmark ratios against industry standards',
    description: isFr
      ? `${m.income > 0 ? `Votre ratio actuel de ${fmtExpRatio(m.expenseRatio, lang)} et une trésorerie de ${fmt(m.cashFlow)} doivent être comparés aux benchmarks de votre secteur pour évaluer la performance réelle.` : 'Enregistrez des transactions pour établir vos ratios de référence.'}`
      : `${m.income > 0 ? `Your current ratio of ${fmtExpRatio(m.expenseRatio, lang)} and cash flow of ${fmt(m.cashFlow)} should be benchmarked against your industry standards to evaluate actual performance.` : 'Record transactions to establish your benchmark ratios.'}`,
    impact: isFr
      ? `Le benchmarking révèle des opportunités d'optimisation invisibles dans l'analyse interne seule`
      : `Benchmarking reveals optimisation opportunities invisible in internal analysis alone`,
    actionLabel: t.viewTrx,
    actionLink: '/transactions',
    metric: m.income > 0 ? { label: t.cashFlow, value: fmt(m.cashFlow) } : null,
  });

  sections.push({ category: 'transactions', icon: 'swap_horiz', color: 'green', title: t.transactionsTitle, suggestions: trxSuggestions });

  // 4. Assets — depreciation & optimisation
  sections.push({
    category: 'assets',
    icon: 'apartment',
    color: 'orange',
    title: t.assetsTitle,
    suggestions: [{
      id: 'exc-asset-depreciation',
      priority: 'low',
      title: isFr ? 'Optimiser la gestion des actifs et amortissements' : 'Optimise asset management and depreciation',
      description: isFr
        ? `${m.assets.length > 0 ? `Vos ${m.assets.length} actifs (${fmt(m.totalAssets)}) doivent être revus annuellement pour optimiser les taux d'amortissement et évaluer les opportunités de remplacement ou de cession.` : 'Enregistrez vos actifs pour bénéficier d\'une gestion d\'amortissement optimisée.'}`
        : `${m.assets.length > 0 ? `Your ${m.assets.length} assets (${fmt(m.totalAssets)}) should be reviewed annually to optimise depreciation rates and evaluate replacement or disposal opportunities.` : 'Record your assets to benefit from optimised depreciation management.'}`,
      impact: isFr
        ? `Une gestion d'amortissement optimisée peut réduire la charge fiscale et améliorer le bilan`
        : `Optimised depreciation management can reduce the tax burden and improve the balance sheet`,
      actionLabel: t.viewAssets,
      actionLink: '/assets',
      metric: m.totalAssets > 0 ? { label: t.totalAssets, value: fmt(m.totalAssets) } : null,
    }],
  });

  const headline = isFr
    ? `Votre entreprise vise l'excellence opérationnelle : ratio de dépenses à ${fmtExpRatio(m.expenseRatio, 'fr')} (cible : 65%), taux de retard à ${r1(m.lateRate)}% (cible : 5%), et trésorerie de ${fmt(m.cashFlow)}. Les ajustements recommandés sont ciblés et progressifs — l'excellence se construit par l'amélioration continue de chaque indicateur.`
    : `Your company targets operational excellence: expense ratio at ${fmtExpRatio(m.expenseRatio, lang)} (target: 65%), late rate at ${r1(m.lateRate)}% (target: 5%), and cash flow of ${fmt(m.cashFlow)}. The recommended adjustments are targeted and progressive — excellence is built through the continuous improvement of each metric.`;

  const targetScore = Math.max(15, 35 - (m.lateRate > 10 ? 5 : 0) - (m.expenseRatio > 0.7 ? 5 : 0));
  return { sections, headline, targetScore, timeframe: isFr ? T.fr.tf_excellence : T.en.tf_excellence };
}

// ─────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────

// ── Inline risk score approximation (mirrors scenarioEngine logic) ──
function computeApproxScore(m) {
  const hasTx = m.transactions && m.transactions.length > 0;
  let cashFlow;
  if (!hasTx && m.income === 0) cashFlow = 20;
  else if (m.income === 0)      cashFlow = 80;
  else {
    const r = m.expenseRatio ?? 0;
    cashFlow = r > 1.5 ? 100 : r > 1.2 ? 95 : r > 1.0 ? 75 : r > 0.8 ? 40 : r > 0.6 ? 20 : 10;
  }
  const totalInv = m.invoiceRevenue || 0;
  const invoices = totalInv === 0 ? 10 : Math.min(100,
    Math.round((m.unpaidAmount / totalInv) * 60 + (m.lateInvoiceAmount / totalInv) * 40)
  );
  let debtRisk;
  if (m.totalDebt === 0)       debtRisk = 5;
  else if (m.debtToAsset === null) debtRisk = 90;
  else {
    const r = m.debtToAsset;
    debtRisk = r > 3 ? 100 : r > 2 ? 95 : r > 1.5 ? 80 : r > 1 ? 70 : r > 0.5 ? 40 : r > 0.3 ? 20 : 10;
  }
  let loanBurden = 0;
  const monthlyIncome = m.income / 12;
  if (!hasTx && m.monthlyPayments > 0)             loanBurden = 30;
  else if (monthlyIncome === 0 && m.monthlyPayments > 0) loanBurden = 95;
  else if (monthlyIncome > 0) {
    const r = m.monthlyPayments / monthlyIncome;
    loanBurden = r > 0.7 ? 100 : r > 0.5 ? 90 : r > 0.3 ? 60 : r > 0.15 ? 30 : 10;
  }
  return Math.round(cashFlow * 0.35 + invoices * 0.25 + debtRisk * 0.25 + loanBurden * 0.15);
}

// ── Scenario alignment check ─────────────────────────────────
function computeScenarioWarning(scenario, m, lang) {
  const isFr = lang === 'fr';
  const isCritical = m.cashFlow < 0 && (m.expenseRatio === null || m.expenseRatio > 1.5);
  const isStressed = m.cashFlow < 0 || (m.expenseRatio !== null && m.expenseRatio > 1);

  // Map: which scenarios are inappropriate for which financial states
  if ((scenario === 'growth' || scenario === 'revenue_optimization' || scenario === 'excellence') && isCritical) {
    return {
      show: true,
      suggestedScenario: 'recovery',
      messageFr: 'Votre situation financière actuelle (trésorerie négative, ratio de dépenses critique) suggère que le scénario "Redressement" serait plus adapté. Les recommandations ci-dessous restent utiles mais doivent être précédées d\'une stabilisation.',
      messageEn: 'Your current financial situation (negative cash flow, critical expense ratio) suggests the "Emergency Recovery" scenario would be more appropriate. The recommendations below remain useful but must be preceded by stabilisation.',
    };
  }
  if ((scenario === 'growth' || scenario === 'excellence') && isStressed && !isCritical) {
    return {
      show: true,
      suggestedScenario: 'stability',
      messageFr: 'Avec une trésorerie tendue, envisagez d\'abord le scénario "Stabilisation" pour sécuriser votre base avant d\'accélérer la croissance.',
      messageEn: 'With a tight cash flow, consider the "Stabilization" scenario first to secure your base before accelerating growth.',
    };
  }
  return { show: false };
}

async function getGoalAdvice(scenario, language = 'fr') {
  const lang = language === 'en' ? 'en' : 'fr';

  const m = await collectMetrics();

  // Compute approximate current risk score using the same weighted formula as scenarioEngine
  const approxScore = computeApproxScore(m);

  const currentMetrics = {
    score:            approxScore,
    income:           m.income,
    expenses:         m.expenses,
    cashFlow:         m.cashFlow,
    totalDebt:        m.totalDebt,
    totalAssets:      m.totalAssets,
    lateInvoiceCount: m.lateInvoiceCount,
    lateInvoiceAmount:m.lateInvoiceAmount,
    unpaidAmount:     m.unpaidAmount,
    totalInvoices:    m.totalInvoices,
    monthlyPayments:  m.monthlyPayments,
    // null means "N/A" (no assets / no income) — frontend handles display
    debtToAsset:      m.debtToAsset,
    expenseRatio:     m.expenseRatio,
    lateRate:         m.lateRate,
  };

  const scenarioWarning = computeScenarioWarning(scenario, m, lang);

  let built;
  switch (scenario) {
    case 'growth':               built = buildGrowth(m, lang);              break;
    case 'stability':            built = buildStability(m, lang);           break;
    case 'debt_reduction':       built = buildDebtReduction(m, lang);       break;
    case 'revenue_optimization': built = buildRevenueOptimization(m, lang); break;
    case 'recovery':             built = buildRecovery(m, lang);            break;
    case 'excellence':           built = buildExcellence(m, lang);          break;
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }

  return {
    scenario,
    currentMetrics,
    scenarioWarning,
    sections:     built.sections,
    headline:     built.headline,
    targetScore:  built.targetScore,
    timeframe:    built.timeframe,
  };
}

module.exports = { getGoalAdvice };
