const express = require('express');
const router = express.Router();
const { login, getMe, updatePassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/loginRateLimiter');

router.post('/login', loginRateLimiter, login);
router.get('/me', auth, getMe);
router.put('/password', auth, updatePassword);

module.exports = router;
