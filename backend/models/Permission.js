const mongoose = require('mongoose');

/**
 * Permission — one row per capability in the system.
 * `key`          unique programmatic identifier (e.g. "invoice.create")
 * `module`       grouping for the UI tab (e.g. "Finances — Factures")
 * `label`        human-readable label in FR
 * `labelEn`      same in EN
 * `allowedRoles` roles permitted to perform the action
 * `bypassRoles`  (only for approval permissions) roles that may skip
 *                the approval workflow even if the threshold is hit
 * `threshold`   (only for approval permissions) monetary threshold in TND
 *                beyond which approval is mandatory
 * `category`    'action' | 'approval' — drives UI rendering
 */
const permissionSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true },
  module:       { type: String, required: true },
  label:        { type: String, required: true },
  labelEn:      { type: String },
  description:  { type: String },
  category:     { type: String, enum: ['action', 'approval'], default: 'action' },
  allowedRoles: { type: [String], default: [] }, // e.g. ['admin', 'owner']
  bypassRoles:  { type: [String], default: [] }, // only for approvals
  threshold:    { type: Number },                 // only for approvals (TND)
  thresholdCurrency: { type: String, default: 'TND' },
  order:        { type: Number, default: 0 },     // display order in the UI
}, { timestamps: true });

module.exports = mongoose.model('Permission', permissionSchema);
