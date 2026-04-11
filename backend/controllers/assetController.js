const Asset = require('../models/Asset');

// POST /api/assets
exports.createAsset = async (req, res) => {
  try {
    const asset = await Asset.create({
      ...req.body,
      companyId: req.user.companyId,
    });
    res.locals.createdEntityId = asset._id;
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/assets
exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ companyId: req.user.companyId });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
