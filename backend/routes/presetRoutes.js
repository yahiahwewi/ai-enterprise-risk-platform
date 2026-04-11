const router = require('express').Router();
const { getPresets, getAllPresets, createPreset, updatePreset, deletePreset } = require('../controllers/presetController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getPresets);
router.get('/all', protect, authorize('admin'), getAllPresets);
router.post('/', protect, authorize('admin'), createPreset);
router.patch('/:id', protect, authorize('admin'), updatePreset);
router.delete('/:id', protect, authorize('admin'), deletePreset);

module.exports = router;
