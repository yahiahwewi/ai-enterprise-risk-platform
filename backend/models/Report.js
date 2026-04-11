const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  type: {
    type: String,
    enum: ['monthly', 'decision', 'risk_detail', 'invoice_analysis'],
    default: 'monthly',
  },
  title: { type: String, required: true },
  period: { type: String }, // e.g. "2026-04"
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

reportSchema.index({ companyId: 1, period: 1, type: 1 });
reportSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
