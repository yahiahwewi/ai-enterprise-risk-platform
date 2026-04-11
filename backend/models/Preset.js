const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['transaction_category', 'transaction_type', 'client'],
    required: true,
  },
  value: { type: String, required: true, trim: true },
  label_fr: { type: String, required: true, trim: true },
  label_en: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

presetSchema.index({ type: 1, active: 1 });

module.exports = mongoose.model('Preset', presetSchema);
