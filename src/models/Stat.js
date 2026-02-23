const mongoose = require('mongoose');

const statSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    date: {
      type: String, // "2024-01-15" — one document per day per user
      required: true,
    },

    // Total minutes the phone was silenced this day
    silencedMinutes: {
      type: Number,
      default: 0,
    },

    // How many schedules triggered this day
    schedulesTriggered: {
      type: Number,
      default: 0,
    },

    // Breakdown by mode
    modeBreakdown: {
      Silent:  { type: Number, default: 0 }, // minutes
      Vibrate: { type: Number, default: 0 },
      DND:     { type: Number, default: 0 },
    },

    // Which schedules fired (array of schedule IDs)
    triggeredSchedules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
      },
    ],
  },
  { timestamps: true }
);

// One stat document per user per day
statSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Stat', statSchema);
