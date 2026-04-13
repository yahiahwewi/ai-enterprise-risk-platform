const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { extractInvoiceFromPDF, detectDuplicate, matchClient } = require('../services/invoiceExtractor');

const UPLOAD_DIR = path.resolve(__dirname, '../uploads/invoices');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
}).single('file');

// POST /api/ai/extract-invoice
exports.extractInvoice = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No PDF file uploaded' });

    try {
      // Save original PDF to disk
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const savedFilename = `${Date.now()}_${safeName}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, savedFilename), req.file.buffer);

      const result = await extractInvoiceFromPDF(req.file.buffer, req.file.originalname);

      // Attach the saved filename so frontend can pass it when creating the invoice
      result.originalPdf = savedFilename;

      const duplicateCheck = await detectDuplicate(result.data);
      if (duplicateCheck) {
        result.duplicates = duplicateCheck;
        result.warnings.push({ field: 'duplicate', message: duplicateCheck.warning });
      }

      if (result.data.clientName) {
        result.clientMatches = await matchClient(result.data.clientName);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Extraction failed: ' + error.message });
    }
  });
};

// GET /api/ai/invoice-pdf/:filename — serve original uploaded PDF
exports.serveOriginalPdf = (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
  res.sendFile(filePath);
};
