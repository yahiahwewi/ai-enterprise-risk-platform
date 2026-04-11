const { analyzeRisk } = require('../services/aiService');
const { generateFinalDecision } = require('../services/decisionEngine');
const { checkAndNotifyRiskAlerts, checkOverdueInvoices, checkNegativeCashFlow } = require('../services/notificationService');

exports.getRiskReport = async (req, res) => {
  try {
    const report = await analyzeRisk();
    checkAndNotifyRiskAlerts(report.globalScore, report.level).catch(() => {});
    checkOverdueInvoices(report.lateInvoicesList).catch(() => {});
    checkNegativeCashFlow(report.metrics.cashFlow).catch(() => {});
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFinalDecision = async (req, res) => {
  try {
    const decision = await generateFinalDecision();
    const { riskReport } = decision;
    checkAndNotifyRiskAlerts(riskReport.globalScore, riskReport.level).catch(() => {});
    checkNegativeCashFlow(riskReport.metrics.cashFlow).catch(() => {});
    res.json(decision);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
