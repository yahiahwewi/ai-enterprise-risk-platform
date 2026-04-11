const router = require('express').Router();
const Rule = require('../models/Rule');
const { protect, authorize } = require('../middleware/auth');

// GET /api/rules — list active rules
router.get('/', protect, async (req, res) => {
  try {
    const rules = await Rule.find().sort({ entityType: 1, createdAt: -1 });
    res.json(rules);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/rules — create rule (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const rule = await Rule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(rule);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/rules/:id — update rule
router.patch('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/rules/:id — delete rule
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rule deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
