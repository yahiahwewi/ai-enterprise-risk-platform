const mongoose = require('mongoose');

const riskMemoSchema = new mongoose.Schema({
  // Author snapshot
  authorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },

  // AI scoring snapshot at the time of writing
  snapshotScore: { type: Number },
  snapshotLevel: { type: String, enum: ['low', 'moderate', 'high', 'critical'] },

  // Analyst-authored content
  severity: { type: String, enum: ['info', 'watch', 'alert', 'critical'], default: 'info' },
  sections: {
    contexte:         { type: String, default: '' },
    observations:     { type: String, default: '' },
    causes:           { type: String, default: '' },
    recommandations:  { type: String, default: '' },
  },

  // Escalation / acknowledgement (only populated when severity === 'critical')
  escalated:           { type: Boolean, default: false },
  escalatedAt:         { type: Date },
  acknowledged:        { type: Boolean, default: false },
  acknowledgedAt:      { type: Date },
  acknowledgedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedByName:  { type: String },
}, { timestamps: true });

riskMemoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RiskMemo', riskMemoSchema);
