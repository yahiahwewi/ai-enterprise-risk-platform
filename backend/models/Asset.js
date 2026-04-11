const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  value: { type: Number, required: true, min: 0 },
  depreciationRate: { type: Number, required: true, min: 0, max: 100 }, // percentage per year
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
