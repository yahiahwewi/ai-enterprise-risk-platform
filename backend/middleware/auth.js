const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  // Support token via query param for file downloads (window.open)
  const queryToken = req.query.token;

  if (!queryToken && (!header || !header.startsWith('Bearer '))) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = queryToken || header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    if (req.user.status !== 'approved') return res.status(403).json({ message: 'Account not approved' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// Restrict to specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

module.exports = { protect, authorize };
