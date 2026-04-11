const Invoice = require('../models/Invoice');

exports.createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    res.locals.createdEntityId = invoice._id;
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const { status, client, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (client) filter.clientName = { $regex: client, $options: 'i' };
    if (from || to) {
      filter.dueDate = {};
      if (from) filter.dueDate.$gte = new Date(from);
      if (to) filter.dueDate.$lte = new Date(to);
    }

    let invoices = await Invoice.find(filter).sort({ dueDate: -1 });

    // Auto-mark overdue invoices as 'late'
    const now = new Date();
    const updates = [];
    invoices = invoices.map((inv) => {
      if (inv.status === 'pending' && new Date(inv.dueDate) < now) {
        inv.status = 'late';
        updates.push(Invoice.findByIdAndUpdate(inv._id, { status: 'late' }));
      }
      return inv;
    });
    if (updates.length > 0) await Promise.all(updates);

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
