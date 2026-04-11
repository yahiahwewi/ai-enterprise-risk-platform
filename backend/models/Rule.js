const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  entityType: { type: String, enum: ['transaction', 'invoice', 'loan'], required: true },
  condition: {
    field: { type: String, required: true },
    operator: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  action: { type: String, enum: ['require_approval', 'notify', 'block'], required: true },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Rule', ruleSchema);
