const Stat     = require('../models/Stat');
const Schedule = require('../models/Schedule');

// ── Helper: get date string "2024-01-15" ──
const dateStr = (d) => d.toISOString().split('T')[0];

// ── Helper: get last N days as date strings ──
const lastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateStr(d));
  }
  return days;
};

// ════════════════════════════════════════
// GET /api/stats/weekly
// Returns last 7 days of silence data
// ════════════════════════════════════════
const getWeeklyStats = async (req, res) => {
  try {
    const days  = lastNDays(7);
    const stats = await Stat.find({
      user: req.user._id,
      date: { $in: days },
    });

    // Map each day — fill 0 if no data exists for that day
    const weeklyData = days.map((date) => {
      const found = stats.find((s) => s.date === date);
      return {
        date,
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        silencedMinutes:    found ? found.silencedMinutes    : 0,
        silencedHours:      found ? +(found.silencedMinutes / 60).toFixed(1) : 0,
        schedulesTriggered: found ? found.schedulesTriggered : 0,
      };
    });

    // Totals
    const totalMinutes    = weeklyData.reduce((s, d) => s + d.silencedMinutes, 0);
    const totalTriggers   = weeklyData.reduce((s, d) => s + d.schedulesTriggered, 0);
    const avgHoursPerDay  = +(totalMinutes / 60 / 7).toFixed(1);

    res.status(200).json({
      success: true,
      data: {
        weeklyData,
        totalHours:    +(totalMinutes / 60).toFixed(1),
        avgHoursPerDay,
        totalTriggers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════════════════════
// GET /api/stats/summary
// Overall summary: modes, top schedule, streaks
// ════════════════════════════════════════
const getSummary = async (req, res) => {
  try {
    const days  = lastNDays(30);
    const stats = await Stat.find({
      user: req.user._id,
      date: { $in: days },
    });

    // Total this month
    const totalMinutes = stats.reduce((s, d) => s + d.silencedMinutes, 0);

    // Mode breakdown totals
    const modes = { Silent: 0, Vibrate: 0, DND: 0 };
    stats.forEach((s) => {
      modes.Silent  += s.modeBreakdown?.Silent  || 0;
      modes.Vibrate += s.modeBreakdown?.Vibrate || 0;
      modes.DND     += s.modeBreakdown?.DND     || 0;
    });

    // Most used mode
    const mostUsedMode = Object.entries(modes).sort((a, b) => b[1] - a[1])[0][0];

    // Active days count (days with >0 minutes)
    const activeDays = stats.filter((s) => s.silencedMinutes > 0).length;

    // Get schedule count for user
    const scheduleCount = await Schedule.countDocuments({
      user: req.user._id,
    });
    const activeScheduleCount = await Schedule.countDocuments({
      user: req.user._id,
      isEnabled: true,
    });

    res.status(200).json({
      success: true,
      data: {
        totalHoursThisMonth: +(totalMinutes / 60).toFixed(1),
        activeDaysThisMonth: activeDays,
        mostUsedMode,
        modeBreakdown:       modes,
        scheduleCount,
        activeScheduleCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════════════════════
// POST /api/stats/log
// Called by the app when a schedule triggers
// ════════════════════════════════════════
const logStat = async (req, res) => {
  try {
    const { date, silencedMinutes, mode, scheduleId } = req.body;
    const today = date || dateStr(new Date());

    // Upsert — update today's doc or create it
    const stat = await Stat.findOneAndUpdate(
      { user: req.user._id, date: today },
      {
        $inc: {
          silencedMinutes:                        silencedMinutes || 0,
          schedulesTriggered:                     1,
          [`modeBreakdown.${mode || 'Silent'}`]:  silencedMinutes || 0,
        },
        ...(scheduleId && {
          $addToSet: { triggeredSchedules: scheduleId },
        }),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: stat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWeeklyStats, getSummary, logStat };
