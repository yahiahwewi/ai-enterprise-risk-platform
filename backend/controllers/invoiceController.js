const Invoice = require('../models/Invoice');

// POST /api/invoices
exports.createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create({
      ...req.body,
      companyId: req.user.companyId,
    });
    res.locals.createdEntityId = invoice._id;
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/invoices
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ companyId: req.user.companyId })
      .sort({ dueDate: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/invoices/:id
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
