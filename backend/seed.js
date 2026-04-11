const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Company = require('./models/Company');
const Transaction = require('./models/Transaction');
const Invoice = require('./models/Invoice');
const Loan = require('./models/Loan');
const Asset = require('./models/Asset');
const Notification = require('./models/Notification');
const ActivityLog = require('./models/ActivityLog');

dotenv.config();

// Helper: date N days ago
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Transaction.deleteMany({}),
    Invoice.deleteMany({}),
    Loan.deleteMany({}),
    Asset.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── Users ────────────────────────────────────────────
  const admin = await User.create({ name: 'Admin User', email: 'admin@erm.com', password: 'admin123', role: 'admin' });

  const owner = await User.create({ name: 'Sarah Johnson', email: 'owner@erm.com', password: 'owner123', role: 'owner' });

  const company = await Company.create({ name: 'TechVision Corp', ownerId: owner._id });
  owner.companyId = company._id;
  await owner.save();

  const accountant = await User.create({ name: 'Ahmed Benali', email: 'accountant@erm.com', password: 'accountant123', role: 'accountant', companyId: company._id });

  const finance = await User.create({ name: 'Maria Garcia', email: 'finance@erm.com', password: 'finance123', role: 'finance', companyId: company._id });

  console.log('Users + Company created');

  // ── Transactions (spread across 90 days for trend analysis) ──
  const transactions = await Transaction.insertMany([
    // Previous period (31-60 days ago) — lower income, lower expenses
    { type: 'income', amount: 35000, category: 'Product Sales', description: 'Monthly product revenue', date: daysAgo(55), companyId: company._id },
    { type: 'income', amount: 12000, category: 'Services', description: 'Consulting fee', date: daysAgo(50), companyId: company._id },
    { type: 'income', amount: 8000, category: 'Subscriptions', description: 'SaaS monthly', date: daysAgo(45), companyId: company._id },
    { type: 'expense', amount: 20000, category: 'Salaries', description: 'Team payroll', date: daysAgo(52), companyId: company._id },
    { type: 'expense', amount: 5000, category: 'Infrastructure', description: 'Cloud hosting', date: daysAgo(48), companyId: company._id },
    { type: 'expense', amount: 3000, category: 'Marketing', description: 'Social media ads', date: daysAgo(43), companyId: company._id },
    { type: 'expense', amount: 2500, category: 'Office', description: 'Office rent', date: daysAgo(40), companyId: company._id },
    { type: 'expense', amount: 4000, category: 'Software', description: 'Tool licenses', date: daysAgo(38), companyId: company._id },

    // Recent period (last 30 days) — higher activity
    { type: 'income', amount: 52000, category: 'Product Sales', description: 'Strong monthly sales', date: daysAgo(25), companyId: company._id },
    { type: 'income', amount: 18000, category: 'Services', description: 'Enterprise consulting', date: daysAgo(20), companyId: company._id },
    { type: 'income', amount: 10000, category: 'Subscriptions', description: 'SaaS subscriptions growth', date: daysAgo(15), companyId: company._id },
    { type: 'income', amount: 7000, category: 'Services', description: 'Workshop revenue', date: daysAgo(8), companyId: company._id },
    { type: 'expense', amount: 22000, category: 'Salaries', description: 'Team payroll + new hire', date: daysAgo(22), companyId: company._id },
    { type: 'expense', amount: 8500, category: 'Infrastructure', description: 'Server upgrade', date: daysAgo(18), companyId: company._id },
    { type: 'expense', amount: 6000, category: 'Marketing', description: 'Product launch campaign', date: daysAgo(12), companyId: company._id },
    { type: 'expense', amount: 2500, category: 'Office', description: 'Office rent', date: daysAgo(10), companyId: company._id },
    { type: 'expense', amount: 4500, category: 'Software', description: 'New tool licenses', date: daysAgo(5), companyId: company._id },

    // Anomalous transaction (3x normal for marketing)
    { type: 'expense', amount: 25000, category: 'Marketing', description: 'Major conference sponsorship', date: daysAgo(3), companyId: company._id },

    // Very recent
    { type: 'income', amount: 15000, category: 'Product Sales', description: 'Enterprise deal closed', date: daysAgo(1), companyId: company._id },

    // Older transactions (61-90 days ago)
    { type: 'income', amount: 30000, category: 'Product Sales', description: 'Quarterly product sales', date: daysAgo(75), companyId: company._id },
    { type: 'expense', amount: 18000, category: 'Salaries', description: 'Team payroll', date: daysAgo(70), companyId: company._id },
    { type: 'expense', amount: 4000, category: 'Marketing', description: 'Content marketing', date: daysAgo(65), companyId: company._id },
    { type: 'income', amount: 5000, category: 'Subscriptions', description: 'SaaS recurring', date: daysAgo(68), companyId: company._id },
  ]);
  console.log(`${transactions.length} transactions seeded (across 90 days)`);

  // ── Invoices ─────────────────────────────────────────
  const invoicesData = await Invoice.insertMany([
    { clientName: 'Acme Corp', amount: 35000, status: 'paid', dueDate: daysAgo(30), companyId: company._id },
    { clientName: 'GlobalTech', amount: 28000, status: 'paid', dueDate: daysAgo(20), companyId: company._id },
    { clientName: 'StartupX', amount: 15000, status: 'pending', dueDate: new Date(Date.now() + 15 * 86400000), companyId: company._id },
    { clientName: 'MegaStore', amount: 42000, status: 'pending', dueDate: new Date(Date.now() + 25 * 86400000), companyId: company._id },
    { clientName: 'OldClient LLC', amount: 18000, status: 'late', dueDate: daysAgo(45), companyId: company._id },
    { clientName: 'SlowPay Inc', amount: 22000, status: 'late', dueDate: daysAgo(60), companyId: company._id },
    { clientName: 'FastPay Ltd', amount: 12000, status: 'paid', dueDate: daysAgo(10), companyId: company._id },
    { clientName: 'BigCorp', amount: 55000, status: 'pending', dueDate: new Date(Date.now() + 40 * 86400000), companyId: company._id },
  ]);
  console.log(`${invoicesData.length} invoices seeded`);

  // ── Loans ────────────────────────────────────────────
  const loansData = await Loan.insertMany([
    { amount: 200000, interestRate: 5.5, duration: 60, monthlyPayment: 3820, companyId: company._id },
    { amount: 50000, interestRate: 7.0, duration: 24, monthlyPayment: 2240, companyId: company._id },
    { amount: 75000, interestRate: 4.2, duration: 36, monthlyPayment: 2220, companyId: company._id },
  ]);
  console.log(`${loansData.length} loans seeded`);

  // ── Assets ───────────────────────────────────────────
  const assetsData = await Asset.insertMany([
    { name: 'Office Equipment', value: 45000, depreciationRate: 15, companyId: company._id },
    { name: 'Company Vehicles', value: 80000, depreciationRate: 20, companyId: company._id },
    { name: 'Server Infrastructure', value: 120000, depreciationRate: 25, companyId: company._id },
    { name: 'Software Patents', value: 200000, depreciationRate: 10, companyId: company._id },
    { name: 'Office Furniture', value: 30000, depreciationRate: 12, companyId: company._id },
  ]);
  console.log(`${assetsData.length} assets seeded`);

  // ── Notifications ────────────────────────────────────
  await Notification.insertMany([
    {
      userId: owner._id, companyId: company._id,
      type: 'risk_alert', title: 'Elevated Risk Warning',
      message: 'Your company risk score has risen to moderate level. Review the AI risk report for details.',
      read: false, severity: 'warning',
    },
    {
      userId: owner._id, companyId: company._id,
      type: 'invoice_overdue', title: 'Overdue Invoices Detected',
      message: '2 invoices totaling $40,000 are overdue. Follow up with OldClient LLC and SlowPay Inc.',
      read: false, severity: 'warning',
    },
    {
      userId: owner._id, companyId: company._id,
      type: 'anomaly_detected', title: 'Unusual Transaction Detected',
      message: 'A $25,000 marketing expense was flagged as unusual — 3x higher than the category average.',
      read: false, severity: 'info',
    },
    {
      userId: owner._id, companyId: company._id,
      type: 'system', title: 'Welcome to ERM Platform',
      message: 'Your enterprise risk management dashboard is ready. Start by reviewing your financial overview.',
      read: true, severity: 'info',
    },
  ]);
  console.log('4 notifications seeded');

  // ── Activity Logs ────────────────────────────────────
  await ActivityLog.insertMany([
    { userId: accountant._id, companyId: company._id, action: 'created', entityType: 'transaction', entityId: transactions[8]._id, details: 'Created income transaction of $52,000 in Product Sales', createdAt: daysAgo(25) },
    { userId: accountant._id, companyId: company._id, action: 'created', entityType: 'transaction', entityId: transactions[9]._id, details: 'Created income transaction of $18,000 in Services', createdAt: daysAgo(20) },
    { userId: accountant._id, companyId: company._id, action: 'created', entityType: 'invoice', entityId: invoicesData[0]._id, details: 'Created invoice of $35,000 for Acme Corp', createdAt: daysAgo(30) },
    { userId: accountant._id, companyId: company._id, action: 'status_changed', entityType: 'invoice', entityId: invoicesData[0]._id, details: 'Updated invoice for Acme Corp to paid', createdAt: daysAgo(28) },
    { userId: finance._id, companyId: company._id, action: 'created', entityType: 'loan', entityId: loansData[0]._id, details: 'Added loan of $200,000 at 5.5%', createdAt: daysAgo(60) },
    { userId: finance._id, companyId: company._id, action: 'created', entityType: 'loan', entityId: loansData[2]._id, details: 'Added loan of $75,000 at 4.2%', createdAt: daysAgo(15) },
    { userId: finance._id, companyId: company._id, action: 'created', entityType: 'asset', entityId: assetsData[0]._id, details: 'Added asset "Office Equipment" valued at $45,000', createdAt: daysAgo(50) },
    { userId: finance._id, companyId: company._id, action: 'created', entityType: 'asset', entityId: assetsData[2]._id, details: 'Added asset "Server Infrastructure" valued at $120,000', createdAt: daysAgo(40) },
    { userId: owner._id, companyId: company._id, action: 'invited', entityType: 'user', entityId: accountant._id, details: 'Invited Ahmed Benali as accountant', createdAt: daysAgo(80) },
    { userId: owner._id, companyId: company._id, action: 'invited', entityType: 'user', entityId: finance._id, details: 'Invited Maria Garcia as finance', createdAt: daysAgo(78) },
  ]);
  console.log('10 activity logs seeded');

  console.log('\n========================================');
  console.log('  SEED COMPLETE - Account Credentials');
  console.log('========================================\n');
  console.log('  ADMIN');
  console.log('    Email:    admin@erm.com');
  console.log('    Password: admin123\n');
  console.log('  BUSINESS OWNER');
  console.log('    Email:    owner@erm.com');
  console.log('    Password: owner123\n');
  console.log('  ACCOUNTANT');
  console.log('    Email:    accountant@erm.com');
  console.log('    Password: accountant123\n');
  console.log('  FINANCE MANAGER');
  console.log('    Email:    finance@erm.com');
  console.log('    Password: finance123\n');
  console.log('  Company: TechVision Corp');
  console.log('  Data: 23 transactions, 8 invoices, 3 loans,');
  console.log('        5 assets, 4 notifications, 10 activity logs');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
