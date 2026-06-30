const { analyzeRisk } = require('../services/aiService');
const { getGoalAdvice, getRecommendedScenario } = require('../services/goalAdvisorService');
const { generateFinalDecision } = require('../services/decisionEngine');
const {
  checkAndNotifyRiskAlerts,
  checkOverdueInvoices,
  checkNegativeCashFlow,
} = require('../services/notificationService');
const { calculateHealthIndex } = require('../services/healthIndex');
const { simulateScenario } = require('../services/scenarioEngine');
const { answerQuestion } = require('../services/copilotService');
const { suggestCategory } = require('../services/categoryService');
const { business } = require('../middleware/metrics');

exports.getRiskReport = async (req, res) => {
  try {
    const lang = req.query.language || req.body.language || 'fr';
    const report = await analyzeRisk(lang);
    business.riskScores.inc();
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
    const lang = req.query.language || req.body.language || 'fr';
    const decision = await generateFinalDecision(lang);
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
    const { question, language } = req.body;
    if (!question) return res.status(400).json({ message: 'Question required' });
    const result = await answerQuestion(question, language || 'fr');
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

exports.getRecommendedScenario = async (req, res) => {
  try {
    const result = await getRecommendedScenario();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getGoalAdvice = async (req, res) => {
  try {
    const { scenario } = req.params;
    const lang = req.query.language || 'fr';
    const validScenarios = [
      'growth',
      'stability',
      'debt_reduction',
      'revenue_optimization',
      'recovery',
      'excellence',
    ];
    if (!validScenarios.includes(scenario)) {
      return res.status(400).json({ message: 'Scénario invalide' });
    }
    const result = await getGoalAdvice(scenario, lang);
    res.json(result);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message, code: err.code, ...(err.details || {}) });
    }
    res.status(500).json({ message: err.message });
  }
};
