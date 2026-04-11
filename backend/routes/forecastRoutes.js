const router = require('express').Router();
const { getInvoiceRisk, getLoanStress, getAssetProjection } = require('../controllers/forecastController');
const { protect, authorize } = require('../middleware/auth');

router.get('/invoice-risk', protect, authorize('owner', 'accountant'), getInvoiceRisk);
router.get('/loan-stress', protect, authorize('owner', 'finance'), getLoanStress);
router.get('/asset-depreciation', protect, authorize('owner', 'finance'), getAssetProjection);

module.exports = router;
