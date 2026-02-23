const express = require('express');
const router  = express.Router();
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  syncSchedules,
} = require('../controllers/schedulesController');
const { protect } = require('../middleware/auth');

// All schedule routes require login
router.use(protect);

router.get('/',          getSchedules);
router.post('/',         createSchedule);
router.put('/:id',       updateSchedule);
router.delete('/:id',    deleteSchedule);
router.post('/sync',     syncSchedules);  // bulk sync from device

module.exports = router;
