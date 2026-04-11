const path = require('path');
const fs = require('fs');
const Report = require('../models/Report');
const { generatePDF } = require('../services/report/pdfGenerator');
const { runMonthlyReports } = require('../services/report/scheduler');

exports.generateReport = async (req, res) => {
  try {
    const { type = 'monthly', language = 'fr' } = req.query;
    const report = await generatePDF({ type, language, generatedBy: 'api' });
    res.status(201).json({
      message: 'Report generated successfully',
      report: {
        id: report._id, title: report.title, filename: report.filename,
        status: report.status, downloadUrl: `/api/export/pdf/${report._id}`,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Report generation failed: ' + error.message });
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'ready') return res.status(202).json({ message: 'Report is still generating' });
    const filePath = path.resolve(report.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReportHistory = async (req, res) => {
  try {
    const { limit = 20, offset = 0, type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit)),
      Report.countDocuments(filter),
    ]);
    res.json({
      reports: reports.map(r => ({
        id: r._id, title: r.title, type: r.type, period: r.period,
        language: r.language, version: r.version, status: r.status,
        fileSize: r.fileSize, data: r.data, generatedBy: r.generatedBy,
        createdAt: r.createdAt,
        downloadUrl: r.status === 'ready' ? `/api/export/pdf/${r._id}` : null,
      })),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/export/invoice-pdf/:invoiceId — Download individual invoice as PDF
exports.downloadInvoicePDF = async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const puppeteer = require('puppeteer');
    const { generateInvoiceHTML } = require('../templates/invoiceTemplate');

    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const lang = req.query.language || 'fr';
    const html = generateInvoiceHTML(invoice.toObject(), lang);

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();

    const filename = `facture_${invoice.clientName.replace(/\s+/g, '_')}_${String(invoice._id).slice(-6).toUpperCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Invoice PDF generation failed: ' + error.message });
  }
};

exports.runScheduler = async (req, res) => {
  try {
    const results = await runMonthlyReports();
    res.json({ message: 'Monthly report generation complete', results });
  } catch (error) {
    res.status(500).json({ message: 'Scheduler failed: ' + error.message });
  }
};
