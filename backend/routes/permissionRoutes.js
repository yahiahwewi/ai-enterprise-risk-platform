const router = require('express').Router();
const { list, update, reset } = require('../controllers/permissionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',           protect, authorize('admin', 'owner'), list);
router.patch('/:key',     protect, authorize('admin', 'owner'), update);
router.post('/reset',     protect, authorize('admin'),           reset);

module.exports = router;
