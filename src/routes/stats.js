const express = require('express');
const router  = express.Router();
const { getWeeklyStats, getSummary, logStat } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/weekly',  getWeeklyStats);
router.get('/summary', getSummary);
router.post('/log',    logStat);

module.exports = router;
