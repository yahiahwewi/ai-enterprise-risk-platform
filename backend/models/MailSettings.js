const mongoose = require('mongoose');

/**
 * Singleton document storing global mailer settings.
 * One row, ID always 'singleton', so we can findOneAndUpdate/upsert safely.
 *
 * `enabled = false` is a kill-switch: the dispatcher returns early before
 * resolving recipients or rendering templates. Per-event toggles are still
 * useful for fine-grained muting; this flag is the master cut-off.
 */
const mailSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'singleton' },
    enabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MailSettings', mailSettingsSchema);
