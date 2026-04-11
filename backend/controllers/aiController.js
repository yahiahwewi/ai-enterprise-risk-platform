const { analyzeRisk } = require('../services/aiService');
const { generateFinalDecision } = require('../services/decisionEngine');
const { checkAndNotifyRiskAlerts, checkOverdueInvoices, checkNegativeCashFlow } = require('../services/notificationService');

// GET /api/ai/risk-report
exports.getRiskReport = async (req, res) => {
  try {
    const report = await analyzeRisk(req.user.companyId);

    // Trigger notifications (fire-and-forget)
    checkAndNotifyRiskAlerts(req.user.companyId, report.globalScore, report.level).catch(() => {});
    checkOverdueInvoices(req.user.companyId, report.lateInvoicesList).catch(() => {});
    checkNegativeCashFlow(req.user.companyId, report.metrics.cashFlow).catch(() => {});

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/ai/final-decision
exports.getFinalDecision = async (req, res) => {
  try {
    const decision = await generateFinalDecision(req.user.companyId);

    // Trigger notifications
    const { riskReport } = decision;
    checkAndNotifyRiskAlerts(req.user.companyId, riskReport.globalScore, riskReport.level).catch(() => {});
    checkNegativeCashFlow(req.user.companyId, riskReport.metrics.cashFlow).catch(() => {});

    res.json(decision);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
