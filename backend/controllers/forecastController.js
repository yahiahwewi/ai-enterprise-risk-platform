const { getInvoiceRiskScores, getLoanStressTest, getAssetDepreciation } = require('../services/forecastService');

exports.getInvoiceRisk = async (req, res) => {
  try {
    const scores = await getInvoiceRiskScores();
    res.json(scores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLoanStress = async (req, res) => {
  try {
    const rateIncrease = parseFloat(req.query.rateIncrease) || 1;
    const result = await getLoanStressTest(rateIncrease);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssetProjection = async (req, res) => {
  try {
    const years = Math.min(parseInt(req.query.years) || 5, 10);
    const result = await getAssetDepreciation(years);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
