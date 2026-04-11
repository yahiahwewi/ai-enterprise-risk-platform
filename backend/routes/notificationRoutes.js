const router = require('express').Router();
const { getNotifications, getUnreadCount, markAsRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/:id/read', protect, markAsRead);
router.post('/mark-all-read', protect, markAllRead);

module.exports = router;
