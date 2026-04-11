const User = require('../models/User');

// GET /api/users — all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/users/pending — pending approval requests (admin only)
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/:id/approve — approve a pending user (admin only)
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.status !== 'pending') return res.status(400).json({ message: 'User is not pending' });

    user.status = 'approved';
    await user.save();
    res.json({ message: `${user.name} has been approved`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/users/:id/reject — reject a pending user (admin only)
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.status !== 'pending') return res.status(400).json({ message: 'User is not pending' });

    user.status = 'rejected';
    await user.save();
    res.json({ message: `${user.name} has been rejected`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/users/invite — invite with auto-approval (owner/admin)
exports.inviteUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!['accountant', 'finance'].includes(role)) {
      return res.status(400).json({ message: 'Can only invite accountant or finance roles' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Invited users are auto-approved (trusted by admin/owner)
    const user = await User.create({ name, email, password, role, status: 'approved' });

    res.locals.createdEntityId = user._id;
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
