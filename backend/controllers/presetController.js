const Preset = require('../models/Preset');

// GET /api/presets?type=transaction_category
exports.getPresets = async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.type) filter.type = req.query.type;
    const presets = await Preset.find(filter).sort({ label_fr: 1 });
    res.json(presets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/presets/all — admin: include inactive
exports.getAllPresets = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const presets = await Preset.find(filter).sort({ type: 1, label_fr: 1 });
    res.json(presets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/presets
exports.createPreset = async (req, res) => {
  try {
    const preset = await Preset.create(req.body);
    res.status(201).json(preset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/presets/:id
exports.updatePreset = async (req, res) => {
  try {
    const preset = await Preset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!preset) return res.status(404).json({ message: 'Preset not found' });
    res.json(preset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/presets/:id
exports.deletePreset = async (req, res) => {
  try {
    await Preset.findByIdAndDelete(req.params.id);
    res.json({ message: 'Preset deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
