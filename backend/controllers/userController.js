const User = require('../models/User');

// GET /api/users — admin sees all, owner sees team
exports.getUsers = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'owner') {
      filter = { companyId: req.user.companyId };
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users/invite — owner invites accountant or finance manager
exports.inviteUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!['accountant', 'finance'].includes(role)) {
      return res.status(400).json({ message: 'Can only invite accountant or finance roles' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      companyId: req.user.companyId,
    });

    res.locals.createdEntityId = user._id;
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
