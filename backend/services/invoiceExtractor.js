/**
 * Invoice Extraction Service
 *
 * Pipeline: PDF → pdf-parse (text) → intelligent chunking → pattern extraction → validation → confidence scoring
 *
 * Extracts: client name, invoice number, dates, amounts (HT, TVA, TTC), line items
 * Validates: TTC = HT + TVA, applies 19% default TVA if missing
 * Returns: structured data + confidence scores + warnings
 */

const pdfParse = require('pdf-parse');
const Invoice = require('../models/Invoice');
const Preset = require('../models/Preset');

// ── Pattern library (FR + EN + Tunisian formats) ──────────
const patterns = {
  invoiceNumber: [
    /(?:facture|invoice|fact\.?|inv\.?|n[°o])\s*[:#]?\s*([A-Z0-9][\w\-\/]+)/i,
    /(?:numéro|number|ref|référence)\s*[:#]?\s*([A-Z0-9][\w\-\/]+)/i,
  ],
  date: [
    /(?:date\s*(?:de\s*)?(?:facture|émission|invoice|issue)?\s*[:#]?\s*)(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ],
  dueDate: [
    /(?:échéance|due\s*date|date\s*(?:de\s*)?(?:paiement|échéance|limit))\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(?:payable|à\s*payer)\s*(?:avant|before)?\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
  ],
  clientName: [
    /(?:client|destinataire|bill\s*to|facturé\s*à|à\s*l'attention\s*de)\s*[:#]?\s*(.+)/i,
    /(?:société|company|entreprise|ste\.?)\s*[:#]?\s*(.+)/i,
  ],
  totalHT: [
    /(?:total\s*(?:hors\s*taxe|ht|h\.t\.|avant\s*taxe|net))\s*[:#]?\s*([\d\s,.]+)/i,
    /(?:subtotal|sous[- ]?total|montant\s*ht)\s*[:#]?\s*([\d\s,.]+)/i,
  ],
  tva: [
    /(?:tva|taxe|vat|t\.v\.a\.?)\s*(?:(?:19|7|13)\s*%?)?\s*[:#]?\s*([\d\s,.]+)/i,
    /(?:montant\s*(?:de\s*la\s*)?(?:tva|taxe))\s*[:#]?\s*([\d\s,.]+)/i,
  ],
  totalTTC: [
    /(?:total\s*(?:ttc|t\.t\.c\.?|toutes\s*taxes|net\s*à\s*payer|à\s*payer))\s*[:#]?\s*([\d\s,.]+)/i,
    /(?:montant\s*(?:total|ttc|net|dû))\s*[:#]?\s*([\d\s,.]+)/i,
    /(?:net\s*à\s*payer|amount\s*due|total\s*amount)\s*[:#]?\s*([\d\s,.]+)/i,
  ],
  amount: [
    /(?:montant|amount|total)\s*[:#]?\s*([\d\s,.]+)\s*(?:tnd|dt|dinars?)?/i,
  ],
  tvaRate: [
    /(?:tva|vat|taxe)\s*[:#]?\s*(\d+)\s*%/i,
  ],
};

// ── Number parsing (handles FR format: 1 234,567 and EN: 1,234.567) ──
function parseNumber(str) {
  if (!str) return null;
  let clean = str.replace(/\s/g, '');
  // FR format: 1.234,56 → replace last comma with dot
  if (clean.includes(',') && clean.indexOf(',') > clean.lastIndexOf('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',') && !clean.includes('.')) {
    clean = clean.replace(',', '.');
  } else {
    clean = clean.replace(/,/g, '');
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.round(num * 1000) / 1000;
}

// ── Date parsing (handles dd/mm/yyyy, dd.mm.yyyy, yyyy-mm-dd) ──
function parseDate(str) {
  if (!str) return null;
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // dd/mm/yyyy or dd.mm.yyyy
  const m = str.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

// ── Extract a field using multiple patterns ──
function extractField(text, fieldPatterns) {
  for (const regex of fieldPatterns) {
    try {
      const match = text.match(regex);
      if (match && match[1]) return match[1].trim();
    } catch { /* skip broken regex on this text */ }
  }
  return null;
}

// ── Main extraction pipeline ──────────────────────────────
async function extractInvoiceFromPDF(pdfBuffer) {
  // Step 1: Parse PDF text
  const parsed = await pdfParse(pdfBuffer);
  const rawText = parsed.text;
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Step 1b: Detect garbled text (custom font encoding)
  // Count ratio of recognizable words vs total words
  const words = rawText.replace(/[^a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const knownWords = /facture|invoice|total|montant|client|date|tva|vat|amount|payment|due|paid|net|ttc|ht|société|company|adresse|address|tel|fax|email/i;
  const recognizable = words.filter(w => knownWords.test(w) || /^[A-Z][a-z]{2,}$/.test(w)).length;
  const readabilityScore = words.length > 0 ? recognizable / words.length : 0;
  const isGarbled = words.length > 20 && readabilityScore < 0.02;

  if (isGarbled) {
    return {
      data: { invoiceNumber: null, clientName: null, issueDate: new Date().toISOString().split('T')[0], dueDate: null, totalHT: null, tvaRate: 19, tva: null, totalTTC: null, amount: null, lineItems: [], detectedLanguage: 'unknown', description: null },
      confidence: { clientName: 0, invoiceNumber: 0, issueDate: 0, dueDate: 0, totalHT: 0, tva: 0, totalTTC: 0, overall: 0 },
      warnings: [{ field: 'document', message: 'Ce PDF utilise des polices encodées que le système ne peut pas lire. Le texte extrait est illisible. Veuillez saisir les données manuellement ou utiliser un PDF avec du texte sélectionnable.' }],
      garbled: true,
      rawText: rawText.substring(0, 500),
      pageCount: parsed.numpages,
    };
  }

  // Step 2: Extract fields
  const invoiceNumber = extractField(rawText, patterns.invoiceNumber);
  const rawDate = extractField(rawText, patterns.date);
  const rawDueDate = extractField(rawText, patterns.dueDate);
  const clientNameRaw = extractField(rawText, patterns.clientName);
  const totalHTRaw = extractField(rawText, patterns.totalHT);
  const tvaRaw = extractField(rawText, patterns.tva);
  const totalTTCRaw = extractField(rawText, patterns.totalTTC);
  const amountRaw = extractField(rawText, patterns.amount);
  const tvaRateMatch = rawText.match(patterns.tvaRate[0]);
  const tvaRate = tvaRateMatch ? parseInt(tvaRateMatch[1]) : 19; // Default Tunisian TVA

  // Parse numbers
  let totalHT = parseNumber(totalHTRaw);
  let tva = parseNumber(tvaRaw);
  let totalTTC = parseNumber(totalTTCRaw);
  const fallbackAmount = parseNumber(amountRaw);

  // Step 3: Smart inference
  // If only one total found, use it
  if (!totalTTC && !totalHT && fallbackAmount) {
    totalTTC = fallbackAmount;
  }

  // Calculate missing values
  if (totalHT && !tva && !totalTTC) {
    tva = Math.round(totalHT * tvaRate / 100 * 1000) / 1000;
    totalTTC = Math.round((totalHT + tva) * 1000) / 1000;
  } else if (totalTTC && !totalHT) {
    totalHT = Math.round(totalTTC / (1 + tvaRate / 100) * 1000) / 1000;
    tva = Math.round((totalTTC - totalHT) * 1000) / 1000;
  } else if (totalHT && totalTTC && !tva) {
    tva = Math.round((totalTTC - totalHT) * 1000) / 1000;
  }

  // Clean client name
  let clientName = clientNameRaw;
  if (clientName) {
    clientName = clientName.replace(/[:\-–]/, '').trim();
    // Remove trailing numbers or dates
    clientName = clientName.replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}.*/, '').trim();
    // Limit to reasonable length
    if (clientName.length > 80) clientName = clientName.substring(0, 80);
  }

  // Parse dates
  const issueDate = parseDate(rawDate);
  const dueDate = parseDate(rawDueDate);

  // Detect language
  const frWords = (rawText.match(/facture|montant|total|échéance|client|société|hors taxe/gi) || []).length;
  const enWords = (rawText.match(/invoice|amount|total|due date|bill to|subtotal/gi) || []).length;
  const detectedLanguage = frWords >= enWords ? 'fr' : 'en';

  // Step 4: Line items extraction (best effort)
  const lineItems = extractLineItems(lines);

  // Step 5: Build result with confidence scores
  const data = {
    invoiceNumber: invoiceNumber || null,
    clientName: clientName || null,
    issueDate: issueDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || null,
    totalHT: totalHT || null,
    tvaRate,
    tva: tva || null,
    totalTTC: totalTTC || null,
    amount: totalTTC || totalHT || fallbackAmount || null,
    lineItems,
    detectedLanguage,
    description: lineItems.length > 0 ? lineItems.map(li => li.description).join(', ') : null,
  };

  // Step 6: Confidence scoring
  const confidence = {
    clientName: clientName ? (clientName.length > 3 ? 0.85 : 0.5) : 0,
    invoiceNumber: invoiceNumber ? 0.9 : 0,
    issueDate: rawDate ? 0.88 : 0.3,
    dueDate: rawDueDate ? 0.88 : 0,
    totalHT: totalHTRaw ? 0.92 : (totalTTC ? 0.7 : 0),
    tva: tvaRaw ? 0.9 : (totalHT && totalTTC ? 0.75 : 0.4),
    totalTTC: totalTTCRaw ? 0.95 : (totalHT ? 0.8 : fallbackAmount ? 0.6 : 0),
    overall: 0,
  };
  const scores = Object.values(confidence).filter(v => typeof v === 'number' && v > 0);
  confidence.overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0;

  // Step 7: Validation & warnings
  const warnings = [];
  if (!clientName) warnings.push({ field: 'clientName', message: 'Client name not detected' });
  if (!data.amount && !totalTTC && !totalHT) warnings.push({ field: 'amount', message: 'No amount detected' });
  if (!dueDate) warnings.push({ field: 'dueDate', message: 'Due date not detected' });
  if (totalHT && totalTTC && tva) {
    const expected = Math.round((totalHT + tva) * 1000) / 1000;
    if (Math.abs(expected - totalTTC) > 0.01) {
      warnings.push({ field: 'totalTTC', message: `Total mismatch: HT(${totalHT}) + TVA(${tva}) = ${expected} ≠ TTC(${totalTTC})` });
    }
  }
  if (tvaRate !== 19 && tvaRate !== 7 && tvaRate !== 13) {
    warnings.push({ field: 'tvaRate', message: `Unusual TVA rate: ${tvaRate}%` });
  }

  return { data, confidence, warnings, rawText: rawText.substring(0, 2000), pageCount: parsed.numpages };
}

// ── Line items extraction ──────────────────────────────────
function extractLineItems(lines) {
  const items = [];
  // Look for lines that contain a quantity and price pattern
  const itemPattern = /^(.+?)\s+(\d+)\s+([\d\s,.]+)\s+([\d\s,.]+)$/;
  const simplePattern = /^(.{5,50})\s+([\d\s,.]+)\s*(?:tnd|dt)?$/i;

  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      items.push({
        description: match[1].trim(),
        quantity: parseInt(match[2]),
        unitPrice: parseNumber(match[3]),
        total: parseNumber(match[4]),
      });
    } else {
      const simple = line.match(simplePattern);
      if (simple && !/(total|tva|sous|montant|date|facture|client)/i.test(line)) {
        const amt = parseNumber(simple[2]);
        if (amt && amt > 0 && amt < 10000000) {
          items.push({ description: simple[1].trim(), quantity: 1, unitPrice: amt, total: amt });
        }
      }
    }
  }
  return items.slice(0, 20); // Max 20 line items
}

// ── Duplicate detection ──────────────────────────────────
async function detectDuplicate(extractedData) {
  if (!extractedData.clientName && !extractedData.amount) return null;

  const filter = {};
  if (extractedData.clientName) filter.clientName = { $regex: extractedData.clientName.substring(0, 20), $options: 'i' };
  if (extractedData.amount) filter.amount = extractedData.amount;

  const existing = await Invoice.find(filter).sort({ createdAt: -1 }).limit(3);
  if (existing.length === 0) return null;

  return {
    possibleDuplicates: existing.map(inv => ({
      id: inv._id,
      clientName: inv.clientName,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      createdAt: inv.createdAt,
    })),
    warning: `Found ${existing.length} existing invoice(s) with similar client/amount`,
  };
}

// ── Client matching ──────────────────────────────────────
async function matchClient(clientName) {
  if (!clientName) return [];

  // Check presets
  const presets = await Preset.find({ type: 'client', active: true });
  const matches = [];

  for (const p of presets) {
    const name = p.label_fr.toLowerCase();
    const input = clientName.toLowerCase();
    if (name.includes(input) || input.includes(name)) {
      matches.push({ value: p.value, label_fr: p.label_fr, label_en: p.label_en, match: 'preset' });
    }
  }

  // Check existing invoices
  const existing = await Invoice.distinct('clientName');
  for (const name of existing) {
    if (name.toLowerCase().includes(clientName.toLowerCase().substring(0, 10))) {
      if (!matches.find(m => m.label_fr === name)) {
        matches.push({ value: name, label_fr: name, label_en: name, match: 'existing' });
      }
    }
  }

  return matches.slice(0, 5);
}

module.exports = { extractInvoiceFromPDF, detectDuplicate, matchClient };
