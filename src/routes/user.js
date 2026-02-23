const express = require('express');
const router  = express.Router();
const { updateProfile, updateAvatar } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect); // all user routes require login

router.put('/profile', updateProfile);
router.put('/avatar',  updateAvatar);

module.exports = router;
