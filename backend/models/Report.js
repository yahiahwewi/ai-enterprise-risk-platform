const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['monthly', 'decision', 'risk_detail', 'invoice_analysis'],
    default: 'monthly',
  },
  title:    { type: String, required: true },
  period:   { type: String },
  language: { type: String, enum: ['fr', 'en'], default: 'fr' },
  version:  { type: Number, default: 1 },
  filename: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  data: {
    globalScore: Number,
    level:       String,
    decision:    String,
    confidence:  Number,
  },
  generatedBy: { type: String, enum: ['manual', 'scheduler', 'api'], default: 'manual' },
  generatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedByName: { type: String }, // snapshot of user's name at generation time
  status:      { type: String, enum: ['generating', 'ready', 'failed'], default: 'generating' },

  // ── Layer 1 & 2: PKI Signature + SHA-256 Hash ──────────────────────────────
  hash:          { type: String },   // SHA-256 hex of original PDF
  signature:     { type: String },   // RSA-SHA256 base64 signature
  certCN:        { type: String },   // Certificate Common Name
  certPem:       { type: String },   // Full certificate PEM (for verification)
  signedAt:      { type: Date   },

  // ── Layer 3b: RFC 3161 TSA (instant) ──────────────────────────────────────
  tsaToken:     { type: Buffer },   // Raw DER-encoded TSA response (the proof)
  tsaStatus:    { type: String, enum: ['ok', 'failed', 'none'], default: 'none' },
  tsaTimestamp: { type: Date   },   // Timestamp returned by the TSA
  tsaIssuer:    { type: String },   // e.g., 'DigiCert TSA'

}, { timestamps: true });

reportSchema.index({ period: 1, type: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
