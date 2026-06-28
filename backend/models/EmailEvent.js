const mongoose = require('mongoose');

/**
 * Centralised catalogue of every transactional email the system can send.
 * Admin / Owner can edit which roles receive each event, mute templates,
 * and override the subject/body without touching the codebase.
 *
 * Templates use {{token}} interpolation, e.g. {{user.name}} {{invoice.amount}}.
 */
const emailEventSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true }, // auth | finance | risk | compliance | admin
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
      default: 'medium',
    },
    active: { type: Boolean, default: true },

    // Default recipient resolution — any user whose role is in this array.
    // The dispatcher additionally injects the "actor" user when the trigger
    // exposes one (e.g. the invoice creator) via the `extraRecipients` hook.
    defaultRoles: { type: [String], default: [] },

    // i18n templates — Mustache-like {{tokens}}
    titleFr: { type: String, required: true },
    titleEn: { type: String, required: true },
    bodyFr: { type: String, required: true },
    bodyEn: { type: String, required: true },

    // Optional metadata for the UI
    descFr: { type: String, default: '' },
    descEn: { type: String, default: '' },

    // Visual theme — one of: auth | danger | reminder | report | info | admin
    // (auto-derived from category+priority if missing)
    theme: { type: String, default: '' },

    // Headline shown in the colored hero band — short, scannable
    heroFr: { type: String, default: '' },
    heroEn: { type: String, default: '' },

    // Material icon name for the hero
    icon: { type: String, default: '' },

    // Key fact dot-paths from the dispatch payload, rendered as a stat strip.
    // e.g. ['invoice.amount', 'invoice.dueDate', 'invoice.clientName']
    keyFacts: { type: [String], default: [] },

    // Optional call-to-action button (relative URL)
    ctaFr: { type: String, default: '' },
    ctaEn: { type: String, default: '' },
    ctaPath: { type: String, default: '' },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailEvent', emailEventSchema);
