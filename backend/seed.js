const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Invoice = require('./models/Invoice');
const Loan = require('./models/Loan');
const Asset = require('./models/Asset');
const Notification = require('./models/Notification');
const ActivityLog = require('./models/ActivityLog');
const Preset = require('./models/Preset');
const Rule = require('./models/Rule');
const ApprovalRequest = require('./models/ApprovalRequest');

dotenv.config();

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Transaction.deleteMany({}),
    Invoice.deleteMany({}),
    Loan.deleteMany({}),
    Asset.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
    Preset.deleteMany({}),
    Rule.deleteMany({}),
    ApprovalRequest.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── Users (all share the same Tac-Tic environment) ──
  const admin = await User.create({ name: 'Admin User', email: 'admin@erm.com', password: 'admin123', role: 'admin', status: 'approved' });
  const owner = await User.create({ name: 'Sarah Johnson', email: 'owner@erm.com', password: 'owner123', role: 'owner', status: 'approved' });
  const accountant = await User.create({ name: 'Ahmed Benali', email: 'accountant@erm.com', password: 'accountant123', role: 'accountant', status: 'approved' });
  const finance = await User.create({ name: 'Maria Garcia', email: 'finance@erm.com', password: 'finance123', role: 'finance', status: 'approved' });
  const analyst = await User.create({ name: 'Leila Trabelsi', email: 'analyst@erm.com', password: 'analyst123', role: 'analyst', status: 'approved' });
  const auditor = await User.create({ name: 'Karim Bouazizi', email: 'auditor@erm.com', password: 'auditor123', role: 'auditor', status: 'approved' });
  // Pending user for testing admin approval workflow
  await User.create({ name: 'Mohamed Kadi', email: 'mohamed@tac-tic.tn', password: 'test123', role: 'accountant', status: 'pending' });
  console.log('7 users created (6 approved + 1 pending)');

  // ── Transactions (spread across 90 days) ──
  const transactions = await Transaction.insertMany([
    { type: 'income', amount: 35000, category: 'Product Sales', description: 'Monthly product revenue', date: daysAgo(55) },
    { type: 'income', amount: 12000, category: 'Services', description: 'Consulting fee', date: daysAgo(50) },
    { type: 'income', amount: 8000, category: 'Subscriptions', description: 'SaaS monthly', date: daysAgo(45) },
    { type: 'expense', amount: 20000, category: 'Salaries', description: 'Team payroll', date: daysAgo(52) },
    { type: 'expense', amount: 5000, category: 'Infrastructure', description: 'Cloud hosting', date: daysAgo(48) },
    { type: 'expense', amount: 3000, category: 'Marketing', description: 'Social media ads', date: daysAgo(43) },
    { type: 'expense', amount: 2500, category: 'Office', description: 'Office rent', date: daysAgo(40) },
    { type: 'expense', amount: 4000, category: 'Software', description: 'Tool licenses', date: daysAgo(38) },
    { type: 'income', amount: 52000, category: 'Product Sales', description: 'Strong monthly sales', date: daysAgo(25) },
    { type: 'income', amount: 18000, category: 'Services', description: 'Enterprise consulting', date: daysAgo(20) },
    { type: 'income', amount: 10000, category: 'Subscriptions', description: 'SaaS subscriptions growth', date: daysAgo(15) },
    { type: 'income', amount: 7000, category: 'Services', description: 'Workshop revenue', date: daysAgo(8) },
    { type: 'expense', amount: 22000, category: 'Salaries', description: 'Team payroll + new hire', date: daysAgo(22) },
    { type: 'expense', amount: 8500, category: 'Infrastructure', description: 'Server upgrade', date: daysAgo(18) },
    { type: 'expense', amount: 6000, category: 'Marketing', description: 'Product launch campaign', date: daysAgo(12) },
    { type: 'expense', amount: 2500, category: 'Office', description: 'Office rent', date: daysAgo(10) },
    { type: 'expense', amount: 4500, category: 'Software', description: 'New tool licenses', date: daysAgo(5) },
    { type: 'expense', amount: 25000, category: 'Marketing', description: 'Major conference sponsorship', date: daysAgo(3) },
    { type: 'income', amount: 15000, category: 'Product Sales', description: 'Enterprise deal closed', date: daysAgo(1) },
    { type: 'income', amount: 30000, category: 'Product Sales', description: 'Quarterly product sales', date: daysAgo(75) },
    { type: 'expense', amount: 18000, category: 'Salaries', description: 'Team payroll', date: daysAgo(70) },
    { type: 'expense', amount: 4000, category: 'Marketing', description: 'Content marketing', date: daysAgo(65) },
    { type: 'income', amount: 5000, category: 'Subscriptions', description: 'SaaS recurring', date: daysAgo(68) },
  ]);
  console.log(`${transactions.length} transactions seeded`);

  const invoicesData = await Invoice.insertMany([
    { clientName: 'Acme Corp', amount: 35000, status: 'paid', dueDate: daysAgo(30) },
    { clientName: 'GlobalTech', amount: 28000, status: 'paid', dueDate: daysAgo(20) },
    { clientName: 'StartupX', amount: 15000, status: 'pending', dueDate: new Date(Date.now() + 15 * 86400000) },
    { clientName: 'MegaStore', amount: 42000, status: 'pending', dueDate: new Date(Date.now() + 25 * 86400000) },
    { clientName: 'OldClient LLC', amount: 18000, status: 'late', dueDate: daysAgo(45) },
    { clientName: 'SlowPay Inc', amount: 22000, status: 'late', dueDate: daysAgo(60) },
    { clientName: 'FastPay Ltd', amount: 12000, status: 'paid', dueDate: daysAgo(10) },
    { clientName: 'BigCorp', amount: 55000, status: 'pending', dueDate: new Date(Date.now() + 40 * 86400000) },
  ]);
  console.log(`${invoicesData.length} invoices seeded`);

  const loansData = await Loan.insertMany([
    { amount: 200000, interestRate: 5.5, duration: 60, monthlyPayment: 3820 },
    { amount: 50000, interestRate: 7.0, duration: 24, monthlyPayment: 2240 },
    { amount: 75000, interestRate: 4.2, duration: 36, monthlyPayment: 2220 },
  ]);
  console.log(`${loansData.length} loans seeded`);

  const assetsData = await Asset.insertMany([
    { name: 'Office Equipment', value: 45000, depreciationRate: 15 },
    { name: 'Company Vehicles', value: 80000, depreciationRate: 20 },
    { name: 'Server Infrastructure', value: 120000, depreciationRate: 25 },
    { name: 'Software Patents', value: 200000, depreciationRate: 10 },
    { name: 'Office Furniture', value: 30000, depreciationRate: 12 },
  ]);
  console.log(`${assetsData.length} assets seeded`);

  await Notification.insertMany([
    { userId: owner._id, type: 'risk_alert', title: 'Elevated Risk Warning', message: 'Risk score has risen to moderate level. Review the AI risk report.', read: false, severity: 'warning' },
    { userId: owner._id, type: 'invoice_overdue', title: 'Overdue Invoices Detected', message: '2 invoices totaling $40,000 are overdue.', read: false, severity: 'warning' },
    { userId: owner._id, type: 'anomaly_detected', title: 'Unusual Transaction Detected', message: 'A $25,000 marketing expense was flagged — 3x higher than average.', read: false, severity: 'info' },
    { userId: owner._id, type: 'system', title: 'Welcome to Tac-Tic ERM', message: 'Your enterprise risk management dashboard is ready.', read: true, severity: 'info' },
  ]);
  console.log('4 notifications seeded');

  await ActivityLog.insertMany([
    { userId: accountant._id, action: 'created', entityType: 'transaction', entityId: transactions[8]._id, details: 'Created income transaction of $52,000 in Product Sales', createdAt: daysAgo(25) },
    { userId: accountant._id, action: 'created', entityType: 'transaction', entityId: transactions[9]._id, details: 'Created income transaction of $18,000 in Services', createdAt: daysAgo(20) },
    { userId: accountant._id, action: 'created', entityType: 'invoice', entityId: invoicesData[0]._id, details: 'Created invoice of $35,000 for Acme Corp', createdAt: daysAgo(30) },
    { userId: accountant._id, action: 'status_changed', entityType: 'invoice', entityId: invoicesData[0]._id, details: 'Updated invoice for Acme Corp to paid', createdAt: daysAgo(28) },
    { userId: finance._id, action: 'created', entityType: 'loan', entityId: loansData[0]._id, details: 'Added loan of $200,000 at 5.5%', createdAt: daysAgo(60) },
    { userId: finance._id, action: 'created', entityType: 'loan', entityId: loansData[2]._id, details: 'Added loan of $75,000 at 4.2%', createdAt: daysAgo(15) },
    { userId: finance._id, action: 'created', entityType: 'asset', entityId: assetsData[0]._id, details: 'Added asset "Office Equipment" valued at $45,000', createdAt: daysAgo(50) },
    { userId: finance._id, action: 'created', entityType: 'asset', entityId: assetsData[2]._id, details: 'Added asset "Server Infrastructure" valued at $120,000', createdAt: daysAgo(40) },
    { userId: owner._id, action: 'invited', entityType: 'user', entityId: accountant._id, details: 'Invited Ahmed Benali as accountant', createdAt: daysAgo(80) },
    { userId: owner._id, action: 'invited', entityType: 'user', entityId: finance._id, details: 'Invited Maria Garcia as finance', createdAt: daysAgo(78) },
  ]);
  console.log('10 activity logs seeded');

  // ── Presets (translated categories, types, clients) ──
  await Preset.insertMany([
    // Transaction categories
    { type: 'transaction_category', value: 'salaries', label_fr: 'Salaires', label_en: 'Salaries' },
    { type: 'transaction_category', value: 'infrastructure', label_fr: 'Infrastructure', label_en: 'Infrastructure' },
    { type: 'transaction_category', value: 'marketing', label_fr: 'Marketing', label_en: 'Marketing' },
    { type: 'transaction_category', value: 'office', label_fr: 'Bureau & Loyer', label_en: 'Office & Rent' },
    { type: 'transaction_category', value: 'software', label_fr: 'Logiciels & Licences', label_en: 'Software & Licenses' },
    { type: 'transaction_category', value: 'product_sales', label_fr: 'Ventes de produits', label_en: 'Product Sales' },
    { type: 'transaction_category', value: 'services', label_fr: 'Services & Conseil', label_en: 'Services & Consulting' },
    { type: 'transaction_category', value: 'subscriptions', label_fr: 'Abonnements', label_en: 'Subscriptions' },
    { type: 'transaction_category', value: 'equipment', label_fr: 'Équipement', label_en: 'Equipment' },
    { type: 'transaction_category', value: 'travel', label_fr: 'Déplacements', label_en: 'Travel' },
    { type: 'transaction_category', value: 'training', label_fr: 'Formation', label_en: 'Training' },
    { type: 'transaction_category', value: 'taxes', label_fr: 'Impôts & Taxes', label_en: 'Taxes' },
    { type: 'transaction_category', value: 'other', label_fr: 'Autre', label_en: 'Other' },
    // Clients
    { type: 'client', value: 'acme_corp', label_fr: 'Acme Corp', label_en: 'Acme Corp' },
    { type: 'client', value: 'globaltech', label_fr: 'GlobalTech', label_en: 'GlobalTech' },
    { type: 'client', value: 'startupx', label_fr: 'StartupX', label_en: 'StartupX' },
    { type: 'client', value: 'megastore', label_fr: 'MegaStore', label_en: 'MegaStore' },
    { type: 'client', value: 'bigcorp', label_fr: 'BigCorp', label_en: 'BigCorp' },
  ]);
  // Invoice categories
  await Preset.insertMany([
    { type: 'invoice_category', value: 'telecom', label_fr: 'Télécom', label_en: 'Telecom' },
    { type: 'invoice_category', value: 'electricity', label_fr: 'Électricité', label_en: 'Electricity' },
    { type: 'invoice_category', value: 'water', label_fr: 'Eau', label_en: 'Water' },
    { type: 'invoice_category', value: 'it_services', label_fr: 'Services IT', label_en: 'IT Services' },
    { type: 'invoice_category', value: 'consulting', label_fr: 'Conseil', label_en: 'Consulting' },
    { type: 'invoice_category', value: 'office_supplies', label_fr: 'Fournitures bureau', label_en: 'Office Supplies' },
    { type: 'invoice_category', value: 'construction', label_fr: 'Construction', label_en: 'Construction' },
    { type: 'invoice_category', value: 'medical', label_fr: 'Médical', label_en: 'Medical' },
    { type: 'invoice_category', value: 'insurance', label_fr: 'Assurance', label_en: 'Insurance' },
    { type: 'invoice_category', value: 'transport', label_fr: 'Transport', label_en: 'Transport' },
    { type: 'invoice_category', value: 'training', label_fr: 'Formation', label_en: 'Training' },
    { type: 'invoice_category', value: 'food_beverage', label_fr: 'Alimentation', label_en: 'Food & Beverage' },
    { type: 'invoice_category', value: 'printing', label_fr: 'Imprimerie', label_en: 'Printing' },
    { type: 'invoice_category', value: 'security', label_fr: 'Sécurité', label_en: 'Security' },
    { type: 'invoice_category', value: 'software', label_fr: 'Logiciels', label_en: 'Software' },
    { type: 'invoice_category', value: 'rent', label_fr: 'Loyer', label_en: 'Rent' },
    { type: 'invoice_category', value: 'marketing', label_fr: 'Marketing', label_en: 'Marketing' },
    { type: 'invoice_category', value: 'freelance', label_fr: 'Freelance', label_en: 'Freelance' },
    { type: 'invoice_category', value: 'import_export', label_fr: 'Import/Export', label_en: 'Import/Export' },
    { type: 'invoice_category', value: 'other', label_fr: 'Autre', label_en: 'Other' },
  ]);
  console.log('Presets seeded (13 tx categories + 5 clients + 20 invoice categories)');

  // ── Business Rules ──
  await Rule.insertMany([
    { name: 'Facture > 10,000 TND', description: 'Les factures supérieures à 10 000 TND nécessitent une approbation', entityType: 'invoice', condition: { field: 'amount', operator: 'gt', value: 10000 }, action: 'require_approval', createdBy: admin._id },
    { name: 'Dépense > 5,000 TND', description: 'Les dépenses supérieures à 5 000 TND déclenchent une notification', entityType: 'transaction', condition: { field: 'amount', operator: 'gt', value: 5000 }, action: 'notify', createdBy: admin._id },
    { name: 'Prêt > 100,000 TND', description: 'Les prêts importants nécessitent une approbation', entityType: 'loan', condition: { field: 'amount', operator: 'gt', value: 100000 }, action: 'require_approval', createdBy: admin._id },
  ]);
  console.log('3 business rules seeded');

  console.log('\n========================================');
  console.log('  TAC-TIC ERM — Seed Complete');
  console.log('========================================\n');
  console.log('  ADMIN:    admin@erm.com / admin123');
  console.log('  OWNER:    owner@erm.com / owner123');
  console.log('  ACCT:     accountant@erm.com / accountant123');
  console.log('  FINANCE:  finance@erm.com / finance123');
  console.log('  ANALYST:  analyst@erm.com / analyst123');
  console.log('  AUDITOR:  auditor@erm.com / auditor123\n');
  console.log('  All users share the same Tac-Tic data.');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
