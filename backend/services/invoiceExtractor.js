/**
 * Invoice Extraction Service
 *
 * Dual pipeline:
 *   1. LlamaParse Cloud API (if LLAMA_CLOUD_API_KEY is set) — handles OCR, encoded fonts, scanned PDFs
 *   2. pdf-parse fallback (local, no API key needed) — works for clean text PDFs
 *
 * After text extraction, applies pattern matching for field extraction,
 * validation, confidence scoring, and duplicate detection.
 */

const pdfParse = require('pdf-parse');
const Invoice = require('../models/Invoice');
const Preset = require('../models/Preset');

const LLAMA_API = 'https://api.cloud.llamaindex.ai/api';
const LLAMA_KEY = process.env.LLAMA_CLOUD_API_KEY || '';

// ── LlamaParse Cloud API ──────────────────────────────────
async function extractWithLlamaParse(pdfBuffer, filename) {
  const fetch = require('node-fetch');
  const FormData = require('form-data');

  // Step 1: Upload file
  const formData = new FormData();
  formData.append('file', pdfBuffer, { filename: filename || 'invoice.pdf', contentType: 'application/pdf' });

  const uploadRes = await fetch(`${LLAMA_API}/v1/files/`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLAMA_KEY}`, ...formData.getHeaders() },
    body: formData,
  });
  if (!uploadRes.ok) throw new Error(`LlamaParse upload failed: ${uploadRes.status}`);
  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;

  // Step 2: Start parsing job
  const parseRes = await fetch(`${LLAMA_API}/v2/parse/`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLAMA_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, version: 'latest' }),
  });
  if (!parseRes.ok) throw new Error(`LlamaParse parse failed: ${parseRes.status}`);
  const parseData = await parseRes.json();
  const jobId = parseData.id;

  // Step 3: Poll for result (max 60 seconds)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const resultRes = await fetch(`${LLAMA_API}/v2/parse/${jobId}/result?include_text=true&include_markdown=true`, {
      headers: { 'Authorization': `Bearer ${LLAMA_KEY}` },
    });
    if (!resultRes.ok) continue;
    const result = await resultRes.json();
    if (result.metadata?.status === 'SUCCESS') {
      return result.text || result.markdown || '';
    }
    if (result.metadata?.status === 'ERROR') throw new Error('LlamaParse processing error');
  }
  throw new Error('LlamaParse timeout after 60s');
}

// ── Local pdf-parse fallback ──────────────────────────────
async function extractWithPdfParse(pdfBuffer) {
  const parsed = await pdfParse(pdfBuffer);
  return parsed.text;
}

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
    /(?:client|destinataire|bill\s*to|facturé\s*à)\s*[:#]?\s*(.+)/i,
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

function parseNumber(str) {
  if (!str) return null;
  let clean = str.replace(/\s/g, '');
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

function parseDate(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function extractField(text, fieldPatterns) {
  for (const regex of fieldPatterns) {
    try {
      const match = text.match(regex);
      if (match && match[1]) return match[1].trim();
    } catch { /* skip */ }
  }
  return null;
}

// ── Main extraction pipeline ──────────────────────────────
async function extractInvoiceFromPDF(pdfBuffer, filename) {
  let rawText = '';
  let usedEngine = 'pdf-parse';

  // Try LlamaParse first if API key is available
  if (LLAMA_KEY) {
    try {
      rawText = await extractWithLlamaParse(pdfBuffer, filename);
      usedEngine = 'llamaparse';
      console.log('[EXTRACTOR] Used LlamaParse Cloud API');
    } catch (err) {
      console.warn('[EXTRACTOR] LlamaParse failed, falling back to pdf-parse:', err.message);
    }
  }

  // Fallback to pdf-parse
  if (!rawText) {
    try {
      rawText = await extractWithPdfParse(pdfBuffer);
      console.log('[EXTRACTOR] Used pdf-parse (local)');
    } catch (err) {
      throw new Error('PDF text extraction failed: ' + err.message);
    }
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect garbled text
  let isGarbled = false;
  try {
    const words = rawText.replace(/[^a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const knownList = ['facture','invoice','total','montant','client','date','tva','vat','amount','payment','due','paid','net','ttc','adresse','address','email','orange','tunisie','telecom','prix','price','service','compte','solde','description'];
    const recognizable = words.filter(w => knownList.includes(w.toLowerCase())).length;
    const readabilityScore = words.length > 0 ? recognizable / words.length : 0;
    isGarbled = words.length > 20 && readabilityScore < 0.05;
  } catch { isGarbled = false; }

  if (isGarbled) {
    return {
      data: { invoiceNumber: null, clientName: null, issueDate: new Date().toISOString().split('T')[0], dueDate: null, totalHT: null, tvaRate: 19, tva: null, totalTTC: null, amount: null, lineItems: [], detectedLanguage: 'unknown', description: null },
      confidence: { clientName: 0, invoiceNumber: 0, issueDate: 0, dueDate: 0, totalHT: 0, tva: 0, totalTTC: 0, overall: 0 },
      warnings: [{ field: 'document', message: usedEngine === 'llamaparse' ? 'LlamaParse could not extract readable text from this PDF. Try manual entry.' : 'Ce PDF utilise des polices encodées non lisibles. Ajoutez LLAMA_CLOUD_API_KEY dans .env pour activer l\'OCR avancé, ou saisissez les données manuellement.' }],
      garbled: true,
      engine: usedEngine,
      rawText: rawText.substring(0, 500),
      pageCount: lines.length > 0 ? Math.ceil(lines.length / 40) : 1,
    };
  }

  // Extract fields — wrapped in try/catch for safety (PDF text can contain regex-breaking chars)
  try {
  const invoiceNumber = extractField(rawText, patterns.invoiceNumber);
  const rawDate = extractField(rawText, patterns.date);
  const rawDueDate = extractField(rawText, patterns.dueDate);
  const clientNameRaw = extractField(rawText, patterns.clientName);
  const totalHTRaw = extractField(rawText, patterns.totalHT);
  const tvaRaw = extractField(rawText, patterns.tva);
  const totalTTCRaw = extractField(rawText, patterns.totalTTC);
  const amountRaw = extractField(rawText, patterns.amount);
  let tvaRateMatch = null;
  try { tvaRateMatch = rawText.match(patterns.tvaRate[0]); } catch {}
  const tvaRate = tvaRateMatch ? parseInt(tvaRateMatch[1]) : 19;

  let totalHT = parseNumber(totalHTRaw);
  let tva = parseNumber(tvaRaw);
  let totalTTC = parseNumber(totalTTCRaw);
  const fallbackAmount = parseNumber(amountRaw);

  if (!totalTTC && !totalHT && fallbackAmount) totalTTC = fallbackAmount;
  if (totalHT && !tva && !totalTTC) { tva = Math.round(totalHT * tvaRate / 100 * 1000) / 1000; totalTTC = Math.round((totalHT + tva) * 1000) / 1000; }
  else if (totalTTC && !totalHT) { totalHT = Math.round(totalTTC / (1 + tvaRate / 100) * 1000) / 1000; tva = Math.round((totalTTC - totalHT) * 1000) / 1000; }
  else if (totalHT && totalTTC && !tva) { tva = Math.round((totalTTC - totalHT) * 1000) / 1000; }

  let clientName = clientNameRaw;
  if (clientName) {
    clientName = clientName.replace(/[:\-–]/, '').trim();
    clientName = clientName.replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}.*/, '').trim();
    if (clientName.length > 80) clientName = clientName.substring(0, 80);
  }

  const issueDate = parseDate(rawDate);
  const dueDate = parseDate(rawDueDate);

  let frWords = 0, enWords = 0;
  try { frWords = (rawText.match(/facture|montant|total|client|date|tva/gi) || []).length; } catch {}
  try { enWords = (rawText.match(/invoice|amount|total|due|bill|subtotal/gi) || []).length; } catch {}
  const detectedLanguage = frWords >= enWords ? 'fr' : 'en';

  const lineItems = extractLineItems(lines);

  const data = {
    invoiceNumber, clientName,
    issueDate: issueDate || new Date().toISOString().split('T')[0],
    dueDate, totalHT, tvaRate, tva, totalTTC,
    amount: totalTTC || totalHT || fallbackAmount || null,
    lineItems, detectedLanguage,
    description: lineItems.length > 0 ? lineItems.map(li => li.description).join(', ') : null,
  };

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

  const warnings = [];
  if (!clientName) warnings.push({ field: 'clientName', message: 'Client name not detected' });
  if (!data.amount) warnings.push({ field: 'amount', message: 'No amount detected' });
  if (!dueDate) warnings.push({ field: 'dueDate', message: 'Due date not detected' });
  if (totalHT && totalTTC && tva) {
    const expected = Math.round((totalHT + tva) * 1000) / 1000;
    if (Math.abs(expected - totalTTC) > 0.01) warnings.push({ field: 'totalTTC', message: `Total mismatch: HT(${totalHT}) + TVA(${tva}) = ${expected} ≠ TTC(${totalTTC})` });
  }

  return { data, confidence, warnings, engine: usedEngine, rawText: rawText.substring(0, 2000), pageCount: Math.ceil(lines.length / 40) || 1 };
  } catch (extractionError) {
    // If pattern matching fails, return partial result with warning
    return {
      data: { invoiceNumber: null, clientName: null, issueDate: new Date().toISOString().split('T')[0], dueDate: null, totalHT: null, tvaRate: 19, tva: null, totalTTC: null, amount: null, lineItems: [], detectedLanguage: 'unknown', description: null },
      confidence: { clientName: 0, invoiceNumber: 0, issueDate: 0, dueDate: 0, totalHT: 0, tva: 0, totalTTC: 0, overall: 0 },
      warnings: [{ field: 'document', message: `Extraction partielle — certains champs n'ont pas pu être lus: ${extractionError.message}` }],
      garbled: false,
      engine: usedEngine,
      rawText: rawText.substring(0, 500),
      pageCount: lines.length > 0 ? Math.ceil(lines.length / 40) : 1,
    };
  }
}

function extractLineItems(lines) {
  const items = [];
  const itemPattern = /^(.+?)\s+(\d+)\s+([\d\s,.]+)\s+([\d\s,.]+)$/;
  const simplePattern = /^(.{5,50})\s+([\d\s,.]+)\s*(?:tnd|dt)?$/i;

  for (const line of lines) {
    try {
      const match = line.match(itemPattern);
      if (match) {
        items.push({ description: match[1].trim(), quantity: parseInt(match[2]), unitPrice: parseNumber(match[3]), total: parseNumber(match[4]) });
        continue;
      }
      const simple = line.match(simplePattern);
      if (simple && !/(total|tva|sous|montant|date|facture|client)/i.test(line)) {
        const amt = parseNumber(simple[2]);
        if (amt && amt > 0 && amt < 10000000) items.push({ description: simple[1].trim(), quantity: 1, unitPrice: amt, total: amt });
      }
    } catch { /* skip */ }
  }
  return items.slice(0, 20);
}

async function detectDuplicate(extractedData) {
  if (!extractedData.clientName && !extractedData.amount) return null;
  const filter = {};
  if (extractedData.clientName) filter.clientName = { $regex: extractedData.clientName.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (extractedData.amount) filter.amount = extractedData.amount;
  const existing = await Invoice.find(filter).sort({ createdAt: -1 }).limit(3);
  if (existing.length === 0) return null;
  return {
    possibleDuplicates: existing.map(inv => ({ id: inv._id, clientName: inv.clientName, amount: inv.amount, dueDate: inv.dueDate, status: inv.status, createdAt: inv.createdAt })),
    warning: `Found ${existing.length} existing invoice(s) with similar client/amount`,
  };
}

async function matchClient(clientName) {
  if (!clientName) return [];
  const presets = await Preset.find({ type: 'client', active: true });
  const matches = [];
  for (const p of presets) {
    if (p.label_fr.toLowerCase().includes(clientName.toLowerCase()) || clientName.toLowerCase().includes(p.label_fr.toLowerCase())) {
      matches.push({ value: p.value, label_fr: p.label_fr, label_en: p.label_en, match: 'preset' });
    }
  }
  const existing = await Invoice.distinct('clientName');
  for (const name of existing) {
    if (name.toLowerCase().includes(clientName.toLowerCase().substring(0, 10))) {
      if (!matches.find(m => m.label_fr === name)) matches.push({ value: name, label_fr: name, label_en: name, match: 'existing' });
    }
  }
  return matches.slice(0, 5);
}

module.exports = { extractInvoiceFromPDF, detectDuplicate, matchClient };
