/**
 * Smart Category Intelligence — suggests categories based on description keywords.
 * Also detects near-duplicates using simple string distance.
 */

const Preset = require('../models/Preset');

const keywordMap = {
  salaries: ['salary', 'salaire', 'payroll', 'paie', 'rémunération', 'wage'],
  infrastructure: ['hosting', 'cloud', 'server', 'serveur', 'hébergement', 'aws', 'azure', 'digital ocean'],
  marketing: ['marketing', 'pub', 'publicité', 'ads', 'campaign', 'campagne', 'sponsor', 'social media'],
  office: ['rent', 'loyer', 'bureau', 'office', 'utilities', 'électricité', 'eau', 'internet'],
  software: ['software', 'logiciel', 'licence', 'license', 'saas', 'tool', 'outil', 'subscription', 'abonnement'],
  product_sales: ['sale', 'vente', 'product', 'produit', 'revenue', 'revenu'],
  services: ['consulting', 'conseil', 'service', 'prestation', 'workshop', 'formation', 'training'],
  subscriptions: ['subscription', 'abonnement', 'recurring', 'récurrent', 'mensuel', 'monthly'],
  equipment: ['equipment', 'équipement', 'matériel', 'hardware', 'machine', 'achat'],
  travel: ['travel', 'voyage', 'déplacement', 'transport', 'flight', 'vol', 'hotel'],
  taxes: ['tax', 'impôt', 'taxe', 'tva', 'fiscal', 'cotisation'],
};

async function suggestCategory(description, amount, type) {
  if (!description) return { suggested: null, confidence: 0, alternatives: [] };

  const words = description.toLowerCase().split(/\s+/);
  const scores = {};

  for (const [category, keywords] of Object.entries(keywordMap)) {
    let score = 0;
    for (const word of words) {
      for (const kw of keywords) {
        if (word.includes(kw) || kw.includes(word)) {
          score += word === kw ? 3 : 1;
        }
      }
    }
    if (score > 0) scores[category] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { suggested: null, confidence: 0, alternatives: [] };

  // Map category key to translated label
  const presets = await Preset.find({ type: 'transaction_category', active: true });
  const presetMap = {};
  presets.forEach(p => { presetMap[p.value] = p; });

  const topKey = sorted[0][0];
  const topPreset = presetMap[topKey];
  const maxScore = sorted[0][1];
  const confidence = Math.min(95, maxScore * 20);

  return {
    suggested: topPreset ? { value: topPreset.value, label_fr: topPreset.label_fr, label_en: topPreset.label_en } : { value: topKey, label_fr: topKey, label_en: topKey },
    confidence,
    alternatives: sorted.slice(1, 4).map(([key]) => presetMap[key] || { value: key, label_fr: key, label_en: key }),
  };
}

function detectDuplicate(input, existingValues) {
  if (!input || input.length < 2) return null;
  const lower = input.toLowerCase().trim();

  for (const val of existingValues) {
    const existing = val.toLowerCase().trim();
    if (existing === lower) continue; // Exact match is fine
    // Simple check: one contains the other, or Levenshtein-like similarity
    if (existing.includes(lower) || lower.includes(existing)) {
      return { duplicate: val, similarity: 'substring' };
    }
    // Character-level similarity
    const longer = Math.max(lower.length, existing.length);
    let match = 0;
    for (let i = 0; i < Math.min(lower.length, existing.length); i++) {
      if (lower[i] === existing[i]) match++;
    }
    if (match / longer > 0.8) {
      return { duplicate: val, similarity: 'high' };
    }
  }
  return null;
}

module.exports = { suggestCategory, detectDuplicate };
