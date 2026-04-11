const ActivityLog = require('../models/ActivityLog');

exports.getActivityLog = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const [logs, total] = await Promise.all([
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .populate('userId', 'name role')
        .skip(offset)
        .limit(limit),
      ActivityLog.countDocuments(),
    ]);

    res.json({ logs, total, hasMore: offset + limit < total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
