const Loan = require('../models/Loan');

exports.createLoan = async (req, res) => {
  try {
    const loan = await Loan.create(req.body);
    res.locals.createdEntityId = loan._id;
    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
