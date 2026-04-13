/**
 * Invoice Extraction Service — Image-based OCR Pipeline
 *
 * Pipeline: PDF → Convert to images → Tesseract.js OCR → Pattern extraction → Validation
 *
 * This approach bypasses all font encoding issues (garbled text from Orange, Telecom, etc.)
 * by treating the PDF as an image and reading it visually with OCR.
 */

const Tesseract = require('tesseract.js');
const puppeteer = require('puppeteer');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Invoice = require('../models/Invoice');
const Preset = require('../models/Preset');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// ── Pattern library (FR + EN + Tunisian formats) ──────────
const patterns = {
  invoiceNumber: [
    // "facture N° : 2011369927" — capture digits after N°
    /facture\s*n[°o]\s*[:#]?\s*(\d{5,})/i,
    /(?:invoice|inv\.?)\s*(?:no?\.?|#|n[°o])\s*[:#]?\s*(\d{5,})/i,
    /n[°o]\s*(?:de\s*)?facture\s*[:#]?\s*(\d{5,})/i,
    /(?:r[ée]f[ée]rence|ref)\s*[:#]?\s*([A-Z0-9][\w\-\/]{4,})/i,
  ],
  date: [
    // "émise le : 01/11/2020"
    /(?:[ée]mise?\s*le|date\s*(?:de\s*)?(?:[ée]mission|facture|invoice))\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(?:invoice\s*date|date)\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ],
  dueDate: [
    // "date limite de paiement 01/12/2020"
    /(?:date\s*limite\s*(?:de\s*)?paiement)\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(?:[ée]ch[ée]ance|due\s*date)\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(?:payable|[àa]\s*payer\s*(?:avant|le)?)\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
    /(?:limite\s*de\s*paiement)\s*[:#]?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/i,
  ],
  clientName: [
    // "votre compte M. TOUMI NIDAL" — capture the name after honorific
    /(?:votre\s*compte)\s*(?:M\.|Mme\.?|Mr\.?|Mrs\.?|Mlle\.?)?\s*(.{3,40})/i,
    // "M. TOUMI NIDAL" standalone on a line
    /^(?:M\.|Mme\.?|Mr\.?|Mrs\.?)?\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s]{3,30})$/m,
    /(?:factur[ée]\s*[àa]|bill\s*to|destinataire)\s*[:#]?\s*(.{3,50})/i,
    /(?:nom\s*(?:du\s*)?client)\s*[:#]?\s*(.{3,50})/i,
    /(?:soci[ée]t[ée]|company|entreprise)\s*[:#]?\s*(.{3,50})/i,
  ],
  totalHT: [
    /(?:total\s*hors\s*taxes?)\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:total\s*(?:ht|h\.t\.))\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:subtotal|sous[- ]?total|montant\s*ht)\s*[:#]?\s*([\d\s.,]+)/i,
  ],
  tva: [
    // "TVA 07% 1.706" — skip the percentage, capture the amount
    /(?:tva|t\.v\.a)\s*\d+\s*%?\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:montant\s*(?:de\s*la\s*)?(?:tva|taxe))\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:vat)\s*[:#]?\s*([\d\s.,]+)/i,
  ],
  totalTTC: [
    /(?:montant\s*ttc)\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:montant\s*[àa]\s*payer)\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:total\s*ttc)\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:net\s*[àa]\s*payer|amount\s*due|total\s*amount)\s*[:#]?\s*([\d\s.,]+)/i,
    /(?:total\s*(?:toutes\s*taxes|t\.t\.c))\s*[:#]?\s*([\d\s.,]+)/i,
  ],
  amount: [
    /(?:montant|amount|total)\s*[:#]?\s*([\d\s.,]+)\s*(?:tnd|dt|dinars?)?/i,
  ],
  tvaRate: [
    /(?:tva|vat|taxe)\s*[:#]?\s*0?(\d{1,2})\s*%/i,
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

// ── PDF to Image conversion (via Puppeteer + pdf.js) ──────
async function pdfToImages(pdfBuffer) {
  const base64 = pdfBuffer.toString('base64');

  // Render PDF in browser using pdf.js (Mozilla's PDF renderer)
  const html = `<!DOCTYPE html><html><head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>body{margin:0;background:#fff}canvas{display:block}</style>
  </head><body><div id="pages"></div><script>
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    (async()=>{
      const data=atob('${base64}');
      const arr=new Uint8Array(data.length);
      for(let i=0;i<data.length;i++)arr[i]=data.charCodeAt(i);
      const pdf=await pdfjsLib.getDocument({data:arr}).promise;
      const container=document.getElementById('pages');
      for(let i=1;i<=Math.min(pdf.numPages,3);i++){
        const page=await pdf.getPage(i);
        const vp=page.getViewport({scale:2.5});
        const canvas=document.createElement('canvas');
        canvas.width=vp.width;canvas.height=vp.height;
        container.appendChild(canvas);
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
      }
      window.__pdfRendered=true;
    })();
  </script></body></html>`;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for pdf.js to finish rendering
  await page.waitForFunction('window.__pdfRendered === true', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1000));

  const screenshot = await page.screenshot({ type: 'png', fullPage: true });
  await browser.close();

  return [screenshot];
}

// ── OCR with Tesseract.js ─────────────────────────────────
async function ocrImages(imageBuffers) {
  const worker = await Tesseract.createWorker('fra+eng', 1, {
    logger: () => {},  // silent
  });

  let fullText = '';
  for (let i = 0; i < Math.min(imageBuffers.length, 3); i++) {  // Max 3 pages
    const { data } = await worker.recognize(Buffer.from(imageBuffers[i]));
    fullText += data.text + '\n\n';
  }

  await worker.terminate();
  return fullText;
}

// ── Main extraction pipeline ──────────────────────────────
async function extractInvoiceFromPDF(pdfBuffer, filename) {
  console.log('[EXTRACTOR] Starting image-based OCR pipeline for:', filename);

  // Step 1: Convert PDF to images
  let imageBuffers;
  try {
    imageBuffers = await pdfToImages(pdfBuffer);
    console.log(`[EXTRACTOR] Converted to ${imageBuffers.length} image(s)`);
  } catch (err) {
    throw new Error('PDF to image conversion failed: ' + err.message);
  }

  // Step 2: OCR the images
  let rawText;
  try {
    rawText = await ocrImages(imageBuffers);
    console.log(`[EXTRACTOR] OCR complete: ${rawText.length} chars extracted`);
  } catch (err) {
    throw new Error('OCR processing failed: ' + err.message);
  }

  if (!rawText || rawText.trim().length < 20) {
    return {
      data: { invoiceNumber: null, clientName: null, issueDate: new Date().toISOString().split('T')[0], dueDate: null, totalHT: null, tvaRate: 19, tva: null, totalTTC: null, amount: null, lineItems: [], detectedLanguage: 'unknown', description: null },
      confidence: { overall: 0 },
      warnings: [{ field: 'document', message: 'OCR could not extract readable text from this PDF.' }],
      garbled: true,
      engine: 'tesseract-ocr',
      rawText: '',
      pageCount: imageBuffers.length,
    };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Step 3: Extract fields from OCR text
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
      // Remove dates, client numbers, addresses from name
      clientName = clientName.replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}.*/, '').trim();
      clientName = clientName.replace(/N[°o]\s*client.*$/i, '').trim();
      clientName = clientName.replace(/CNT\d+.*$/i, '').trim();
      clientName = clientName.replace(/\d+,?\s*rue\s.*$/i, '').trim();
      // Remove trailing numbers
      clientName = clientName.replace(/\s+\d+\s*$/, '').trim();
      if (clientName.length > 60) clientName = clientName.substring(0, 60);
      if (clientName.length < 2) clientName = null;
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
      clientName: clientName ? (clientName.length > 3 ? 0.82 : 0.45) : 0,
      invoiceNumber: invoiceNumber ? 0.85 : 0,
      issueDate: rawDate ? 0.85 : 0.3,
      dueDate: rawDueDate ? 0.85 : 0,
      totalHT: totalHTRaw ? 0.88 : (totalTTC ? 0.65 : 0),
      tva: tvaRaw ? 0.85 : (totalHT && totalTTC ? 0.7 : 0.35),
      totalTTC: totalTTCRaw ? 0.9 : (totalHT ? 0.75 : fallbackAmount ? 0.55 : 0),
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
      if (Math.abs(expected - totalTTC) > 1) warnings.push({ field: 'totalTTC', message: `Total mismatch: HT(${totalHT}) + TVA(${tva}) = ${expected} ≠ TTC(${totalTTC})` });
    }

    // Step 4: AI Verification via Groq LLM
    let aiVerification = null;
    if (groq) {
      try {
        aiVerification = await verifyWithGroq(rawText.substring(0, 3000), data);
        // Apply AI corrections if confident
        if (aiVerification.corrections) {
          const c = aiVerification.corrections;
          if (c.clientName && (!data.clientName || aiVerification.fieldConfidence?.clientName > confidence.clientName)) {
            data.clientName = c.clientName;
            confidence.clientName = 0.95;
          }
          if (c.invoiceNumber && (!data.invoiceNumber || aiVerification.fieldConfidence?.invoiceNumber > confidence.invoiceNumber)) {
            data.invoiceNumber = c.invoiceNumber;
            confidence.invoiceNumber = 0.95;
          }
          if (c.totalTTC && (!data.totalTTC || aiVerification.fieldConfidence?.totalTTC > confidence.totalTTC)) {
            data.totalTTC = c.totalTTC;
            data.amount = c.totalTTC;
            confidence.totalTTC = 0.95;
          }
          if (c.totalHT && (!data.totalHT || aiVerification.fieldConfidence?.totalHT > confidence.totalHT)) {
            data.totalHT = c.totalHT;
            confidence.totalHT = 0.95;
          }
          if (c.tva != null && (!data.tva || aiVerification.fieldConfidence?.tva > confidence.tva)) {
            data.tva = c.tva;
            confidence.tva = 0.95;
          }
          if (c.dueDate && !data.dueDate) {
            data.dueDate = c.dueDate;
            confidence.dueDate = 0.9;
          }
          if (c.issueDate && confidence.issueDate < 0.5) {
            data.issueDate = c.issueDate;
            confidence.issueDate = 0.9;
          }
          if (c.tvaRate) data.tvaRate = c.tvaRate;
        }
        // Apply AI-detected category
        if (aiVerification.category) {
          data.category = aiVerification.category;
        }

        // Recalculate overall confidence
        const scores = Object.values(confidence).filter(v => typeof v === 'number' && v > 0);
        confidence.overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0;

        // Add AI validation notes to warnings
        if (aiVerification.issues?.length > 0) {
          aiVerification.issues.forEach(issue => {
            warnings.push({ field: 'ai_check', message: `🤖 ${issue}` });
          });
        }
      } catch (aiErr) {
        console.warn('[EXTRACTOR] Groq verification failed:', aiErr.message);
      }
    }

    return { data, confidence, warnings, engine: groq ? 'tesseract-ocr + groq-ai' : 'tesseract-ocr', aiVerification: aiVerification ? { verified: true, model: aiVerification.model } : null, rawText: rawText.substring(0, 2000), pageCount: imageBuffers.length };
  } catch (extractionError) {
    return {
      data: { invoiceNumber: null, clientName: null, issueDate: new Date().toISOString().split('T')[0], dueDate: null, totalHT: null, tvaRate: 19, tva: null, totalTTC: null, amount: null, lineItems: [], detectedLanguage: 'unknown', description: null },
      confidence: { overall: 0 },
      warnings: [{ field: 'document', message: `Extraction error: ${extractionError.message}` }],
      garbled: false,
      engine: 'tesseract-ocr',
      rawText: rawText.substring(0, 500),
      pageCount: imageBuffers.length,
    };
  }
}

// ── AI Verification via Groq LLM ──────────────────────────
async function verifyWithGroq(ocrText, extractedData) {
  const prompt = `You are an invoice data extraction validator. Analyze the OCR text below and verify/correct the extracted data.

OCR TEXT:
${ocrText}

EXTRACTED DATA:
- Client Name: ${extractedData.clientName || 'NOT FOUND'}
- Invoice Number: ${extractedData.invoiceNumber || 'NOT FOUND'}
- Issue Date: ${extractedData.issueDate || 'NOT FOUND'}
- Due Date: ${extractedData.dueDate || 'NOT FOUND'}
- Total HT: ${extractedData.totalHT || 'NOT FOUND'}
- TVA Rate: ${extractedData.tvaRate || 'NOT FOUND'}%
- TVA Amount: ${extractedData.tva || 'NOT FOUND'}
- Total TTC: ${extractedData.totalTTC || 'NOT FOUND'}

INSTRUCTIONS:
1. Verify each field against the OCR text
2. Correct any wrong extractions
3. Find any missing fields
4. Check if TTC = HT + TVA
5. Identify the TVA rate used
6. Classify the invoice into one category from this list:
   Telecom, Electricity, Water, IT Services, Consulting, Office Supplies,
   Construction, Medical, Insurance, Transport, Training, Food & Beverage,
   Printing, Security, Software, Rent, Marketing, Freelance, Import/Export, Other

Respond ONLY in valid JSON (no markdown, no explanation):
{
  "corrections": {
    "clientName": "corrected name or null if original is correct",
    "invoiceNumber": "corrected number or null",
    "issueDate": "YYYY-MM-DD or null",
    "dueDate": "YYYY-MM-DD or null",
    "totalHT": number or null,
    "tva": number or null,
    "totalTTC": number or null,
    "tvaRate": number or null
  },
  "category": "one of the categories above",
  "fieldConfidence": {
    "clientName": 0.0-1.0,
    "invoiceNumber": 0.0-1.0,
    "totalTTC": 0.0-1.0,
    "totalHT": 0.0-1.0,
    "tva": 0.0-1.0
  },
  "issues": ["list of problems found"],
  "summary": "one line summary of verification"
}`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  const result = JSON.parse(raw);
  result.model = 'llama-3.3-70b-versatile';

  // Clean corrections — remove nulls and "null" strings
  if (result.corrections) {
    for (const [k, v] of Object.entries(result.corrections)) {
      if (v === null || v === 'null' || v === 'NOT FOUND' || v === '') {
        delete result.corrections[k];
      }
    }
  }

  console.log('[EXTRACTOR] Groq AI verification:', result.summary);
  return result;
}

function extractLineItems(lines) {
  const items = [];
  const itemPattern = /^(.+?)\s+(\d+)\s+([\d\s.,]+)\s+([\d\s.,]+)$/;
  const simplePattern = /^(.{5,50})\s+([\d\s.,]+)\s*(?:tnd|dt)?$/i;

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
  if (extractedData.clientName) {
    const safe = extractedData.clientName.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.clientName = { $regex: safe, $options: 'i' };
  }
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
