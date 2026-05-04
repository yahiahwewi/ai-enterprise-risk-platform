const router = require('express').Router();
const {
  register,
  login,
  getMe,
  verifyEmail,
  resendOtp,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateVerifyEmail,
  validateResendOtp,
} = require('../middleware/validators');

router.post('/register',     validateRegister,    register);
router.post('/login',        validateLogin,       login);
router.post('/verify-email', validateVerifyEmail, verifyEmail);
router.post('/resend-otp',   validateResendOtp,   resendOtp);
router.get('/me', protect, getMe);

module.exports = router;
