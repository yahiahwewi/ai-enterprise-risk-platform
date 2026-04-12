const multer = require('multer');
const { extractInvoiceFromPDF, detectDuplicate, matchClient } = require('../services/invoiceExtractor');

// Multer: in-memory storage for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
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
      // Step 1: Extract from PDF
      const result = await extractInvoiceFromPDF(req.file.buffer, req.file.originalname);

      // Step 2: Check for duplicates
      const duplicateCheck = await detectDuplicate(result.data);
      if (duplicateCheck) {
        result.duplicates = duplicateCheck;
        result.warnings.push({ field: 'duplicate', message: duplicateCheck.warning });
      }

      // Step 3: Match client with existing DB
      if (result.data.clientName) {
        const clientMatches = await matchClient(result.data.clientName);
        result.clientMatches = clientMatches;
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Extraction failed: ' + error.message });
    }
  });
};
