const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Invoice = require('./models/Invoice');
const Loan = require('./models/Loan');
const Asset = require('./models/Asset');
const Notification = require('./models/Notification');
const ActivityLog = require('./models/ActivityLog');

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
  ]);
  console.log('Cleared existing data');

  // ── Users (all share the same Tac-Tic environment) ──
  const admin = await User.create({ name: 'Admin User', email: 'admin@erm.com', password: 'admin123', role: 'admin', status: 'approved' });
  const owner = await User.create({ name: 'Sarah Johnson', email: 'owner@erm.com', password: 'owner123', role: 'owner', status: 'approved' });
  const accountant = await User.create({ name: 'Ahmed Benali', email: 'accountant@erm.com', password: 'accountant123', role: 'accountant', status: 'approved' });
  const finance = await User.create({ name: 'Maria Garcia', email: 'finance@erm.com', password: 'finance123', role: 'finance', status: 'approved' });
  // Pending user for testing admin approval workflow
  await User.create({ name: 'Mohamed Kadi', email: 'mohamed@tac-tic.dz', password: 'test123', role: 'accountant', status: 'pending' });
  console.log('5 users created (4 approved + 1 pending)');

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

  console.log('\n========================================');
  console.log('  TAC-TIC ERM — Seed Complete');
  console.log('========================================\n');
  console.log('  ADMIN:    admin@erm.com / admin123');
  console.log('  OWNER:    owner@erm.com / owner123');
  console.log('  ACCT:     accountant@erm.com / accountant123');
  console.log('  FINANCE:  finance@erm.com / finance123\n');
  console.log('  All users share the same Tac-Tic data.');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
