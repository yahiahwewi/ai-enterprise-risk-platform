const Asset = require('../models/Asset');

exports.createAsset = async (req, res) => {
  try {
    const asset = await Asset.create(req.body);
    res.locals.createdEntityId = asset._id;
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
