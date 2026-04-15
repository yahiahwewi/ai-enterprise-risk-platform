/**
 * DEV SCENARIO SEEDER
 * Deletes all financial data and seeds realistic good or bad scenarios
 * for testing and demonstration purposes.
 *
 * Route: POST /api/dev/seed/:scenario  (owner only)
 */

const Transaction = require('../models/Transaction');
const Invoice     = require('../models/Invoice');
const Loan        = require('../models/Loan');
const Asset       = require('../models/Asset');
const User        = require('../models/User');

// ─── helpers ──────────────────────────────────────────────
function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 86_400_000);
}
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

// ─── GOOD SCENARIO ────────────────────────────────────────
// Expected result: globalScore ≈ 15-20 | level: low | grade: A
async function seedGood(userId) {
  const transactions = [];

  // 12 months of healthy income + controlled expenses
  for (let m = 11; m >= 0; m--) {
    const dayOffset = m * 30 + 10;
    // Main income (consulting / services)
    transactions.push({ type: 'income', amount: rand(45000, 58000), date: daysAgo(dayOffset), category: 'Services', description: 'Prestations de services mensuelles', submittedBy: userId, workflowStatus: 'approved' });
    // Secondary income
    transactions.push({ type: 'income', amount: rand(8000, 12000), date: daysAgo(dayOffset + 5), category: 'Ventes', description: 'Ventes de produits', submittedBy: userId, workflowStatus: 'approved' });
    // Controlled expenses
    transactions.push({ type: 'expense', amount: rand(12000, 16000), date: daysAgo(dayOffset + 2), category: 'Salaires', description: 'Salaires du personnel', submittedBy: userId, workflowStatus: 'approved' });
    transactions.push({ type: 'expense', amount: rand(4000, 6000),   date: daysAgo(dayOffset + 8), category: 'Loyer',     description: 'Loyer bureaux',            submittedBy: userId, workflowStatus: 'approved' });
    transactions.push({ type: 'expense', amount: rand(2000, 4000),   date: daysAgo(dayOffset + 15), category: 'Fournitures', description: 'Fournitures et matériels', submittedBy: userId, workflowStatus: 'approved' });
  }

  // Invoices: mostly paid, very few late
  const invoices = [
    // Paid (10)
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
    // Pending (future) — 3
    { clientName: 'Clinique El Manar',         amount: rand(10000, 14000), status: 'pending', issueDate: daysAgo(20), dueDate: daysFromNow(20), category: 'Santé',    submittedBy: userId, workflowStatus: 'draft' },
    { clientName: 'Résidence Les Pins',        amount: rand(15000, 19000), status: 'pending', issueDate: daysAgo(10), dueDate: daysFromNow(30), category: 'Immobilier', submittedBy: userId, workflowStatus: 'draft' },
    { clientName: 'Société Agro-Export SARL',  amount: rand(8000,  11000), status: 'pending', issueDate: daysAgo(5),  dueDate: daysFromNow(45), category: 'Agriculture', submittedBy: userId, workflowStatus: 'draft' },
    // Late (2 — small amounts, minimal impact)
    { clientName: 'Divers Client A',           amount: rand(1500,   2500), status: 'late', issueDate: daysAgo(50), dueDate: daysAgo(15), category: 'Divers', submittedBy: userId, workflowStatus: 'draft' },
    { clientName: 'Divers Client B',           amount: rand(2000,   3000), status: 'late', issueDate: daysAgo(45), dueDate: daysAgo(10), category: 'Divers', submittedBy: userId, workflowStatus: 'draft' },
  ];

  // Loans: 1 manageable loan
  const loanAmt = 80000, loanRate = 7, loanDur = 48;
  const loans = [{
    amount: loanAmt, interestRate: loanRate, duration: loanDur,
    monthlyPayment: monthlyPayment(loanAmt, loanRate, loanDur),
    workflowStatus: 'approved', submittedBy: userId,
  }];

  // Assets: solid asset base
  const assets = [
    { name: 'Matériel informatique',   value: 85000,  depreciationRate: 20 },
    { name: 'Véhicule de service',     value: 65000,  depreciationRate: 15 },
    { name: 'Mobilier de bureau',      value: 30000,  depreciationRate: 10 },
    { name: 'Équipement technique',    value: 55000,  depreciationRate: 12 },
  ];

  await Promise.all([
    Transaction.insertMany(transactions),
    Invoice.insertMany(invoices),
    Loan.insertMany(loans),
    Asset.insertMany(assets),
  ]);
}

// ─── BAD SCENARIO ─────────────────────────────────────────
// Expected result: globalScore ≈ 88-95 | level: critical | grade: F
async function seedBad(userId) {
  const transactions = [];

  // 6 months of very low income + heavy expenses
  for (let m = 5; m >= 0; m--) {
    const dayOffset = m * 30 + 5;
    // Minimal income
    transactions.push({ type: 'income', amount: rand(2000, 4000), date: daysAgo(dayOffset), category: 'Services', description: 'Recette exceptionnelle', submittedBy: userId, workflowStatus: 'approved' });
    // Heavy expenses — 3-4x income
    transactions.push({ type: 'expense', amount: rand(8000,  12000), date: daysAgo(dayOffset + 3),  category: 'Salaires',   description: 'Salaires (retard)',           submittedBy: userId, workflowStatus: 'approved' });
    transactions.push({ type: 'expense', amount: rand(4000,   6000), date: daysAgo(dayOffset + 8),  category: 'Loyer',      description: 'Loyer (pénalités incluses)', submittedBy: userId, workflowStatus: 'approved' });
    transactions.push({ type: 'expense', amount: rand(3000,   5000), date: daysAgo(dayOffset + 12), category: 'Fournisseurs', description: 'Dettes fournisseurs',       submittedBy: userId, workflowStatus: 'approved' });
    transactions.push({ type: 'expense', amount: rand(2000,   4000), date: daysAgo(dayOffset + 20), category: 'Autres',     description: 'Charges diverses urgentes',  submittedBy: userId, workflowStatus: 'approved' });
  }

  // Invoices: almost all late, high amounts uncollected
  const clients = [
    'Pharmacie Centrale Sousse', 'Groupe Bâtiment Nord', 'SARL Constructions Rapides',
    'Textile Export Monastir', 'Cabinet Juridique Ben Ali', 'Société Import-Export Mehdi',
    'Agence Immobilière Carthage', 'Restaurant Le Jasmin Tunis',
  ];
  const invoices = [];
  // 18 late — overdue, large amounts
  for (let i = 0; i < 18; i++) {
    const daysOverdue = rand(30, 200);
    invoices.push({
      clientName: clients[i % clients.length],
      amount: rand(15000, 95000),
      status: 'late',
      issueDate: daysAgo(daysOverdue + 30),
      dueDate:   daysAgo(daysOverdue),
      category: ['Services', 'Travaux', 'Marchandises', 'Conseils'][i % 4],
      submittedBy: userId, workflowStatus: 'draft',
    });
  }
  // 1 pending
  invoices.push({ clientName: clients[0], amount: rand(5000, 10000), status: 'pending', issueDate: daysAgo(15), dueDate: daysFromNow(10), category: 'Services', submittedBy: userId, workflowStatus: 'draft' });
  // 1 paid (minimal)
  invoices.push({ clientName: clients[1], amount: rand(800, 1500), status: 'paid', issueDate: daysAgo(60), dueDate: daysAgo(30), category: 'Divers', submittedBy: userId, workflowStatus: 'approved' });

  // Loans: 2 heavy loans, no assets to back them
  const loan1Amt = 120000, loan1Rate = 15, loan1Dur = 36;
  const loan2Amt = 85000,  loan2Rate = 18, loan2Dur = 24;
  const loans = [
    { amount: loan1Amt, interestRate: loan1Rate, duration: loan1Dur, monthlyPayment: monthlyPayment(loan1Amt, loan1Rate, loan1Dur), workflowStatus: 'approved', submittedBy: userId },
    { amount: loan2Amt, interestRate: loan2Rate, duration: loan2Dur, monthlyPayment: monthlyPayment(loan2Amt, loan2Rate, loan2Dur), workflowStatus: 'approved', submittedBy: userId },
  ];

  // Assets: NONE — makes debt-to-asset ratio = ∞ → debtRisk = 90
  const assets = [];

  await Promise.all([
    Transaction.insertMany(transactions),
    Invoice.insertMany(invoices),
    Loan.insertMany(loans.filter(Boolean)),
    ...(assets.length ? [Asset.insertMany(assets)] : []),
  ]);
}

// ─── CONTROLLER ───────────────────────────────────────────
exports.seedScenario = async (req, res) => {
  try {
    const { scenario } = req.params;
    if (!['good', 'bad'].includes(scenario)) {
      return res.status(400).json({ message: 'Scénario invalide. Utilisez "good" ou "bad".' });
    }

    await wipeFinancialData();

    if (scenario === 'good') {
      await seedGood(req.user._id);
    } else {
      await seedBad(req.user._id);
    }

    const labels = {
      good: { fr: 'Bon scénario seedé avec succès — score attendu : 15-20 (Faible)', en: 'Good scenario seeded — expected score: 15-20 (Low)' },
      bad:  { fr: 'Mauvais scénario seedé avec succès — score attendu : 88-95 (Critique)', en: 'Bad scenario seeded — expected score: 88-95 (Critical)' },
    };

    res.json({
      success: true,
      scenario,
      message: labels[scenario].fr,
      seeded: {
        transactions: scenario === 'good' ? 36 : 30,
        invoices:     scenario === 'good' ? 15  : 20,
        loans:        scenario === 'good' ? 1   : 2,
        assets:       scenario === 'good' ? 4   : 0,
      },
    });
  } catch (err) {
    console.error('[DEV SEED] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
