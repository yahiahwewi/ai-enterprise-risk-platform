const mongoose = require('mongoose');

const linkedEntitySchema = new mongoose.Schema({
  kind:      { type: String, enum: ['invoice', 'transaction', 'loan', 'asset', 'user', 'report'], required: true },
  entityId:  { type: mongoose.Schema.Types.ObjectId, required: true },
  label:     { type: String, required: true }, // snapshot label (e.g. "Facture INV-473 · BigCorp · 55 000 TND")
  amount:    { type: Number },                  // snapshot amount when relevant
  reason:    { type: String, default: '' },     // why it was linked
  addedAt:   { type: Date, default: Date.now },
  addedBy:   { type: String },
}, { _id: true });

const timelineNoteSchema = new mongoose.Schema({
  text:       { type: String, required: true },
  severity:   { type: String, enum: ['info', 'finding', 'non_compliance'], default: 'info' },
  authorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String },
  createdAt:  { type: Date, default: Date.now },
}, { _id: true });

const investigationSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  subject: { type: String, default: '' }, // plain-text description of the suspicion
  status:  { type: String, enum: ['open', 'closed'], default: 'open' },

  // Auditor attribution
  auditorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  auditorName: { type: String, required: true },

  // Evidence
  linkedEntities: [linkedEntitySchema],
  timeline:       [timelineNoteSchema],

  // Signed export
  exportReportId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  closedAt:          { type: Date },
  conclusion:        { type: String, default: '' },
}, { timestamps: true });

investigationSchema.index({ createdAt: -1 });
investigationSchema.index({ status: 1, auditorId: 1 });

module.exports = mongoose.model('Investigation', investigationSchema);
