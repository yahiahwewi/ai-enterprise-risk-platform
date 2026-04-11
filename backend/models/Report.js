const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['monthly', 'decision', 'risk_detail', 'invoice_analysis'],
    default: 'monthly',
  },
  title: { type: String, required: true },
  period: { type: String },
  language: { type: String, enum: ['fr', 'en'], default: 'fr' },
  version: { type: Number, default: 1 },
  filename: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  data: {
    globalScore: Number,
    level: String,
    decision: String,
    confidence: Number,
  },
  generatedBy: { type: String, enum: ['manual', 'scheduler', 'api'], default: 'manual' },
  status: { type: String, enum: ['generating', 'ready', 'failed'], default: 'generating' },
}, { timestamps: true });

reportSchema.index({ period: 1, type: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
