const router = require('express').Router();
const { createAsset, getAssets } = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/auth');
const { validateAsset } = require('../middleware/validators');
const logActivity = require('../middleware/activityLogger');

router.post('/', protect, authorize('finance', 'owner'), validateAsset, logActivity('created', 'asset'), createAsset);
router.get('/', protect, getAssets);

module.exports = router;
