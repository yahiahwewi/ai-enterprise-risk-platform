const router = require('express').Router();
const ctrl = require('../controllers/investigationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',             protect, authorize('auditor', 'owner', 'admin'), ctrl.list);
router.post('/',            protect, authorize('auditor', 'owner', 'admin'), ctrl.create);
router.get('/:id',          protect, authorize('auditor', 'owner', 'admin'), ctrl.getOne);
router.patch('/:id',        protect, authorize('auditor', 'owner', 'admin'), ctrl.update);
router.delete('/:id',       protect, authorize('auditor', 'admin'),          ctrl.remove);

router.post('/:id/link',                protect, authorize('auditor', 'owner', 'admin'), ctrl.linkEntity);
router.delete('/:id/link/:linkId',      protect, authorize('auditor', 'owner', 'admin'), ctrl.unlinkEntity);
router.post('/:id/notes',               protect, authorize('auditor', 'owner', 'admin'), ctrl.addNote);
router.post('/:id/close-and-export',    protect, authorize('auditor', 'admin'),          ctrl.closeAndExport);

module.exports = router;
