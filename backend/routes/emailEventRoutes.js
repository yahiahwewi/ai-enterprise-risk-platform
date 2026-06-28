const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  list,
  update,
  reset,
  testSend,
  getSettings,
  updateSettings,
} = require('../controllers/emailEventController');

router.get('/settings', protect, authorize('admin', 'owner'), getSettings);
router.patch('/settings', protect, authorize('admin', 'owner'), updateSettings);
router.get('/', protect, authorize('admin', 'owner'), list);
router.patch('/:key', protect, authorize('admin', 'owner'), update);
router.post('/reset', protect, authorize('admin', 'owner'), reset);
router.post('/:key/test', protect, authorize('admin', 'owner'), testSend);

module.exports = router;
