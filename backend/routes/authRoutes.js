const router = require('express').Router();
const {
  register,
  login,
  getMe,
  verifyEmail,
  resendOtp,
  googleLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateVerifyEmail,
  validateResendOtp,
} = require('../middleware/validators');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/verify-email', validateVerifyEmail, verifyEmail);
router.post('/resend-otp', validateResendOtp, resendOtp);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);

module.exports = router;
