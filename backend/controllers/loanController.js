const Loan = require('../models/Loan');

// POST /api/loans
exports.createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({
      ...req.body,
      companyId: req.user.companyId,
    });
    res.locals.createdEntityId = loan._id;
    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/loans
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ companyId: req.user.companyId });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
