const Schedule = require('../models/Schedule');

// GET /api/schedules — get all schedules for logged-in user
const getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/schedules — create new schedule
const createSchedule = async (req, res) => {
  try {
    const { name, icon, startTime, endTime, days, mode, isEnabled } = req.body;

    const schedule = await Schedule.create({
      user: req.user._id,
      name, icon, startTime, endTime, days, mode, isEnabled,
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/schedules/:id — update schedule
const updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.',
      });
    }

    const { name, icon, startTime, endTime, days, mode, isEnabled } = req.body;
    if (name      !== undefined) schedule.name      = name;
    if (icon      !== undefined) schedule.icon      = icon;
    if (startTime !== undefined) schedule.startTime = startTime;
    if (endTime   !== undefined) schedule.endTime   = endTime;
    if (days      !== undefined) schedule.days      = days;
    if (mode      !== undefined) schedule.mode      = mode;
    if (isEnabled !== undefined) schedule.isEnabled = isEnabled;

    await schedule.save();
    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/schedules/:id
const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Schedule deleted.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/schedules/sync — bulk sync from device to cloud
const syncSchedules = async (req, res) => {
  try {
    const { schedules } = req.body; // guest schedules from device

    // ── FIX: MERGE not replace ──
    // Keep all existing cloud schedules, just ADD the guest ones on top.
    // This prevents wiping previously saved login schedules.

    if (!schedules || schedules.length === 0) {
      // Nothing to sync — just return existing cloud schedules
      const existing = await Schedule.find({ user: req.user._id }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, message: 'Nothing to sync.', data: existing });
    }

    // Insert guest schedules as NEW entries (do not delete existing)
    const toInsert = schedules.map((s) => ({
      name:      s.name,
      icon:      s.icon,
      startTime: s.startTime,
      endTime:   s.endTime,
      days:      s.days,
      mode:      s.mode,
      isEnabled: s.isEnabled,
      user:      req.user._id,
      // _id intentionally omitted — MongoDB assigns a fresh one
    }));

    await Schedule.insertMany(toInsert);

    // Return ALL schedules (existing cloud + newly synced guest ones)
    const all = await Schedule.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: `${toInsert.length} guest schedules merged into your account.`,
      data: all,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  syncSchedules,
};
