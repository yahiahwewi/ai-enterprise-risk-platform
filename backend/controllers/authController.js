const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register — public signup (pending approval)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Only accountant and finance can self-register
    const allowedRoles = ['accountant', 'finance', 'analyst', 'auditor'];
    const safeRole = allowedRoles.includes(role) ? role : 'accountant';

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user with pending status — requires admin approval
    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Account created. Pending admin approval.',
      user,
      pending: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Block non-approved users
    if (user.status === 'pending') {
      return res.status(403).json({
        message: 'Your account is pending admin approval.',
        status: 'pending',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        message: 'Your access request has been denied.',
        status: 'rejected',
      });
    }

    res.json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json(req.user);
};
