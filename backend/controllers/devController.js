/**
 * DEV SCENARIO SEEDER
 * Seeds financial data with CALENDAR-ALIGNED dates so the AI fiscal
 * calendar, scoring and alerts remain coherent across all pages.
 *
 * Key conventions (adapted to Tunisian SMEs):
 *   • Payroll            — fixed day of month (GOOD = 28, BAD = 29)
 *   • Loyer (rent)       — 1st of every month
 *   • CNSS contributions — 15th (statutory)
 *   • VAT/TVA liquidité  — 28th
 *   • Income             — month-end (consulting payment cycles)
 *   • Supplies / other   — mid-month
 *
 * Route: POST /api/dev/seed/:scenario  (owner only)
 */

const Transaction = require('../models/Transaction');
const Invoice     = require('../models/Invoice');
const Loan        = require('../models/Loan');
const Asset       = require('../models/Asset');

// ─── date helpers ──────────────────────────────────────────────
/**
 * Build a date that always falls on `dayOfMonth` for `monthsBack` ago.
 * If the computed date would be in the future (e.g. today is the 20th
 * and we ask for day 28 of the current month) we drop back one extra
 * month so the transaction is always in the past.
 */
function dateOnDay(dayOfMonth, monthsBack = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() - monthsBack;
  // Find the last valid day of that specific month (28/29/30/31) and clamp.
  const lastOfMonth = new Date(y, m + 1, 0).getDate();
  const safeDay = Math.min(Math.max(dayOfMonth, 1), lastOfMonth);
  const target = new Date(y, m, safeDay, 9, 0, 0); // 09:00 local
  if (target > now) target.setMonth(target.getMonth() - 1);
  return target;
}
function daysFromNow(n) { return new Date(Date.now() + n * 86_400_000); }
function daysAgo(n)     { return new Date(Date.now() - n * 86_400_000); }

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 1000) / 1000;
}
// Amortisation formula  M = P·r / (1 − (1+r)^−n)
function monthlyPayment(P, annualRate, n) {
  if (!annualRate) return Math.round((P / n) * 1000) / 1000;
  const r = annualRate / 100 / 12;
  return Math.round((P * r) / (1 - Math.pow(1 + r, -n)) * 1000) / 1000;
}

// ─── WIPE ─────────────────────────────────────────────────
async function wipeFinancialData() {
  await Promise.all([
    Transaction.deleteMany({}),
    Invoice.deleteMany({}),
    Loan.deleteMany({}),
    Asset.deleteMany({}),
  ]);
}

// ═══════════════════════════════════════════════════════════
// GOOD SCENARIO — steady, well-run SME
// Expected result: globalScore ≈ 15-20 | level: low | grade: A
// ═══════════════════════════════════════════════════════════
async function seedGood(userId) {
  const transactions = [];
  const PAYROLL_DAY    = 28;
  const RENT_DAY       = 1;
  const CNSS_DAY       = 15;
  const VAT_DAY        = 28;
  const INCOME_DAY     = 27;     // consulting contracts pay month-end
  const SUPPLIES_DAY   = 14;     // quartermaster orders mid-month

  // 12 months of healthy cash flow
  for (let m = 11; m >= 0; m--) {
    // Primary income — end of month
    transactions.push({
      type: 'income', amount: rand(48000, 58000),
      date: dateOnDay(INCOME_DAY, m), category: 'Services',
      description: 'Prestations de services mensuelles',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Secondary income — mid month
    transactions.push({
      type: 'income', amount: rand(8000, 12000),
      date: dateOnDay(SUPPLIES_DAY, m), category: 'Ventes',
      description: 'Ventes de produits',
      submittedBy: userId, workflowStatus: 'approved',
    });

    // Rent — 1st
    transactions.push({
      type: 'expense', amount: rand(4500, 5500),
      date: dateOnDay(RENT_DAY, m), category: 'Loyer',
      description: 'Loyer bureaux',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // CNSS — 15th
    transactions.push({
      type: 'expense', amount: rand(3200, 3800),
      date: dateOnDay(CNSS_DAY, m), category: 'Charges sociales',
      description: 'Cotisations CNSS',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Supplies / misc — 14th
    transactions.push({
      type: 'expense', amount: rand(2000, 3500),
      date: dateOnDay(SUPPLIES_DAY, m), category: 'Fournitures',
      description: 'Fournitures et matériels',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Payroll — 28th (FIXED DAY)
    transactions.push({
      type: 'expense', amount: rand(12500, 14500),
      date: dateOnDay(PAYROLL_DAY, m), category: 'Salaires',
      description: 'Salaires du personnel (versement mensuel)',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // VAT settlement — 28th (same day, different category)
    if (m < 6) { // only seed the last 6 months of VAT to keep total counts in check
      transactions.push({
        type: 'expense', amount: rand(3000, 4500),
        date: dateOnDay(VAT_DAY, m), category: 'Impôts',
        description: 'TVA mensuelle',
        submittedBy: userId, workflowStatus: 'approved',
      });
    }
  }

  // Invoices — mostly paid, few late
  const invoices = [
    // Paid history (10 ×)
    { clientName: 'Alpha Conseil Tunis',       amount: rand(18000, 22000), status: 'paid', issueDate: daysAgo(120), dueDate: daysAgo(90),  category: 'Services',    submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Clinique El Manar',         amount: rand(9000,  12000), status: 'paid', issueDate: daysAgo(100), dueDate: daysAgo(70),  category: 'Santé',       submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Résidence Les Pins',        amount: rand(14000, 18000), status: 'paid', issueDate: daysAgo(90),  dueDate: daysAgo(60),  category: 'Immobilier',  submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Société Agro-Export SARL',  amount: rand(22000, 28000), status: 'paid', issueDate: daysAgo(80),  dueDate: daysAgo(50),  category: 'Agriculture', submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'TechInnov Sfax',            amount: rand(11000, 15000), status: 'paid', issueDate: daysAgo(70),  dueDate: daysAgo(40),  category: 'Technologie', submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Hôtel Azur Sousse',         amount: rand(16000, 20000), status: 'paid', issueDate: daysAgo(60),  dueDate: daysAgo(30),  category: 'Tourisme',    submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Cabinet Dentaire Mariem',   amount: rand(5000,   8000), status: 'paid', issueDate: daysAgo(55),  dueDate: daysAgo(25),  category: 'Santé',       submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Librairie Ibn Khaldoun',    amount: rand(3500,   5000), status: 'paid', issueDate: daysAgo(45),  dueDate: daysAgo(15),  category: 'Éducation',   submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'Alpha Conseil Tunis',       amount: rand(19000, 23000), status: 'paid', issueDate: daysAgo(40),  dueDate: daysAgo(10),  category: 'Services',    submittedBy: userId, workflowStatus: 'approved' },
    { clientName: 'TechInnov Sfax',            amount: rand(12000, 16000), status: 'paid', issueDate: daysAgo(35),  dueDate: daysAgo(5),   category: 'Technologie', submittedBy: userId, workflowStatus: 'approved' },
    // Pending — future, aligned to 15 or 30 of the month
    { clientName: 'Clinique El Manar',         amount: rand(10000, 14000), status: 'pending', issueDate: daysAgo(20), dueDate: daysFromNow(15), category: 'Santé',       submittedBy: userId, workflowStatus: 'draft' },
    { clientName: 'Résidence Les Pins',        amount: rand(15000, 19000), status: 'pending', issueDate: daysAgo(10), dueDate: daysFromNow(28), category: 'Immobilier',  submittedBy: userId, workflowStatus: 'draft' },
    { clientName: 'Société Agro-Export SARL',  amount: rand(8000,  11000), status: 'pending', issueDate: daysAgo(5),  dueDate: daysFromNow(45), category: 'Agriculture', submittedBy: userId, workflowStatus: 'draft' },
    // Late — minimal (small amounts)
    { clientName: 'Divers Client A',           amount: rand(1500,  2500),  status: 'late',    issueDate: daysAgo(50), dueDate: daysAgo(15), category: 'Divers', submittedBy: userId, workflowStatus: 'draft' },
    { clientName: 'Divers Client B',           amount: rand(2000,  3000),  status: 'late',    issueDate: daysAgo(45), dueDate: daysAgo(10), category: 'Divers', submittedBy: userId, workflowStatus: 'draft' },
  ];

  // Loans — one manageable
  const loanAmt = 80000, loanRate = 7, loanDur = 48;
  const loans = [{
    amount: loanAmt, interestRate: loanRate, duration: loanDur,
    monthlyPayment: monthlyPayment(loanAmt, loanRate, loanDur),
    workflowStatus: 'approved', submittedBy: userId,
  }];

  // Assets — solid base
  const assets = [
    { name: 'Matériel informatique', value: 85000, depreciationRate: 20 },
    { name: 'Véhicule de service',   value: 65000, depreciationRate: 15 },
    { name: 'Mobilier de bureau',    value: 30000, depreciationRate: 10 },
    { name: 'Équipement technique',  value: 55000, depreciationRate: 12 },
  ];

  await Promise.all([
    Transaction.insertMany(transactions),
    Invoice.insertMany(invoices),
    Loan.insertMany(loans),
    Asset.insertMany(assets),
  ]);
  return { transactions: transactions.length, invoices: invoices.length, loans: loans.length, assets: assets.length };
}

// ═══════════════════════════════════════════════════════════
// BAD SCENARIO — distressed SME, heavy debt, poor collection
// Expected result: globalScore ≈ 88-95 | level: critical | grade: F
// ═══════════════════════════════════════════════════════════
async function seedBad(userId) {
  const transactions = [];
  const PAYROLL_DAY    = 29;   // late — company stretches the month
  const RENT_DAY       = 5;    // delayed by a few days (penalty notices)
  const CNSS_DAY       = 20;   // 5 days overdue vs. statutory 15th
  const INCOME_DAY     = 10;   // erratic income, mid-month
  const EXPENSES_DAY   = 22;

  // 6 months of deficit operations
  for (let m = 5; m >= 0; m--) {
    // Minimal, erratic income
    transactions.push({
      type: 'income', amount: rand(2000, 4000),
      date: dateOnDay(INCOME_DAY, m), category: 'Services',
      description: 'Recette exceptionnelle',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Payroll — 29th, late (cash-strapped)
    transactions.push({
      type: 'expense', amount: rand(9000, 12000),
      date: dateOnDay(PAYROLL_DAY, m), category: 'Salaires',
      description: 'Salaires (versement tardif)',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Rent — delayed with penalties
    transactions.push({
      type: 'expense', amount: rand(4000, 6000),
      date: dateOnDay(RENT_DAY, m), category: 'Loyer',
      description: 'Loyer (pénalités incluses)',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // CNSS — late declaration (20th instead of 15th)
    transactions.push({
      type: 'expense', amount: rand(2500, 3500),
      date: dateOnDay(CNSS_DAY, m), category: 'Charges sociales',
      description: 'CNSS (retard — majorations)',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Supplier debts mid-month
    transactions.push({
      type: 'expense', amount: rand(3000, 5000),
      date: dateOnDay(EXPENSES_DAY, m), category: 'Fournisseurs',
      description: 'Dettes fournisseurs',
      submittedBy: userId, workflowStatus: 'approved',
    });
    // Urgent misc expenses
    transactions.push({
      type: 'expense', amount: rand(2000, 4000),
      date: dateOnDay(EXPENSES_DAY + 3, m), category: 'Autres',
      description: 'Charges diverses urgentes',
      submittedBy: userId, workflowStatus: 'approved',
    });
  }

  // Invoices — mostly overdue, large amounts uncollected
  const clients = [
    'Pharmacie Centrale Sousse', 'Groupe Bâtiment Nord', 'SARL Constructions Rapides',
    'Textile Export Monastir',   'Cabinet Juridique Ben Ali', 'Société Import-Export Mehdi',
    'Agence Immobilière Carthage', 'Restaurant Le Jasmin Tunis',
  ];
  const invoices = [];
  // 18 late
  for (let i = 0; i < 18; i++) {
    const daysOverdue = rand(30, 200);
    invoices.push({
      clientName: clients[i % clients.length],
      amount:     rand(15000, 95000),
      status:     'late',
      issueDate:  daysAgo(daysOverdue + 30),
      dueDate:    daysAgo(daysOverdue),
      category:   ['Services', 'Travaux', 'Marchandises', 'Conseils'][i % 4],
      submittedBy: userId, workflowStatus: 'draft',
    });
  }
  // 1 pending  — aligned to end of month
  invoices.push({
    clientName: clients[0], amount: rand(5000, 10000), status: 'pending',
    issueDate:  daysAgo(15), dueDate: daysFromNow(10),
    category:   'Services', submittedBy: userId, workflowStatus: 'draft',
  });
  // 1 paid (minimal)
  invoices.push({
    clientName: clients[1], amount: rand(800, 1500), status: 'paid',
    issueDate:  daysAgo(60), dueDate: daysAgo(30),
    category:   'Divers', submittedBy: userId, workflowStatus: 'approved',
  });

  // Loans — 2 heavy with high rates
  const loan1Amt = 120000, loan1Rate = 15, loan1Dur = 36;
  const loan2Amt = 85000,  loan2Rate = 18, loan2Dur = 24;
  const loans = [
    { amount: loan1Amt, interestRate: loan1Rate, duration: loan1Dur, monthlyPayment: monthlyPayment(loan1Amt, loan1Rate, loan1Dur), workflowStatus: 'approved', submittedBy: userId },
    { amount: loan2Amt, interestRate: loan2Rate, duration: loan2Dur, monthlyPayment: monthlyPayment(loan2Amt, loan2Rate, loan2Dur), workflowStatus: 'approved', submittedBy: userId },
  ];

  // Assets — none (debt-to-asset ratio → ∞)
  const assets = [];

  await Promise.all([
    Transaction.insertMany(transactions),
    Invoice.insertMany(invoices),
    Loan.insertMany(loans),
    ...(assets.length ? [Asset.insertMany(assets)] : []),
  ]);
  return { transactions: transactions.length, invoices: invoices.length, loans: loans.length, assets: assets.length };
}

// ─── CONTROLLER ───────────────────────────────────────────
exports.seedScenario = async (req, res) => {
  try {
    const { scenario } = req.params;
    if (!['good', 'bad'].includes(scenario)) {
      return res.status(400).json({ message: 'Scénario invalide. Utilisez "good" ou "bad".' });
    }

    await wipeFinancialData();

    const counts = scenario === 'good'
      ? await seedGood(req.user._id)
      : await seedBad(req.user._id);

    const labels = {
      good: {
        fr: `Bon scénario seedé (paie le 28, CNSS le 15, loyer le 1er) — score attendu : 15-20 (Faible)`,
        en: `Good scenario seeded (payroll on 28, CNSS on 15, rent on 1st) — expected score: 15-20 (Low)`,
      },
      bad: {
        fr: `Mauvais scénario seedé (paie tardive le 29, CNSS en retard le 20) — score attendu : 88-95 (Critique)`,
        en: `Bad scenario seeded (late payroll on 29, delayed CNSS on 20) — expected score: 88-95 (Critical)`,
      },
    };

    res.json({
      success:  true,
      scenario,
      message:  labels[scenario].fr,
      seeded:   counts,
      pattern:  scenario === 'good'
        ? { payrollDay: 28, rentDay: 1, cnssDay: 15, incomeDay: 27 }
        : { payrollDay: 29, rentDay: 5, cnssDay: 20, incomeDay: 10 },
    });
  } catch (err) {
    console.error('[DEV SEED] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
