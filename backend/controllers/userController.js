const User = require('../models/User');

// GET /api/users — all users (single company, shared data)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users/invite — invite accountant or finance manager
exports.inviteUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!['accountant', 'finance'].includes(role)) {
      return res.status(400).json({ message: 'Can only invite accountant or finance roles' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role });

    res.locals.createdEntityId = user._id;
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
