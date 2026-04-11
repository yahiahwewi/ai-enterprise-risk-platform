const Transaction = require('../models/Transaction');
const { evaluateRules, applyRuleActions } = require('../services/ruleEngine');

exports.createTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create({ ...req.body, submittedBy: req.user._id, workflowStatus: 'draft' });

    // Evaluate rules
    const triggered = await evaluateRules('transaction', transaction, req.user._id);
    if (triggered.length > 0) {
      const { requiresApproval } = await applyRuleActions('transaction', transaction, transaction._id, triggered, req.user._id);
      if (requiresApproval) {
        transaction.workflowStatus = 'pending_approval';
        await transaction.save();
      }
    } else {
      // No rules triggered — auto-approve
      transaction.workflowStatus = 'approved';
      await transaction.save();
    }

    res.locals.createdEntityId = transaction._id;
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { type, category, from, to, workflowStatus } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (workflowStatus) filter.workflowStatus = workflowStatus;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
