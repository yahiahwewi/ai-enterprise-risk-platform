const { analyzeRisk } = require('../services/aiService');
const { generateFinalDecision } = require('../services/decisionEngine');
const { checkAndNotifyRiskAlerts, checkOverdueInvoices, checkNegativeCashFlow } = require('../services/notificationService');
const { calculateHealthIndex } = require('../services/healthIndex');
const { simulateScenario } = require('../services/scenarioEngine');
const { answerQuestion } = require('../services/copilotService');
const { suggestCategory } = require('../services/categoryService');

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

exports.getHealthIndex = async (req, res) => {
  try {
    const index = await calculateHealthIndex();
    res.json(index);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.simulate = async (req, res) => {
  try {
    const result = await simulateScenario(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.copilot = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: 'Question required' });
    const result = await answerQuestion(question);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.suggestCat = async (req, res) => {
  try {
    const result = await suggestCategory(req.body.description, req.body.amount, req.body.type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
