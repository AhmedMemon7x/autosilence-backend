const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name:      { type: String,  required: true, trim: true },
    icon:      { type: String,  default: '💼' },
    startTime: { type: String,  required: true }, // "09:00"
    endTime:   { type: String,  required: true }, // "17:30"
    days:      { type: [String], required: true }, // ["Mon","Tue"]
    mode: {
      type: String,
      enum: ['Silent', 'Vibrate', 'DND'],
      default: 'Silent',
    },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
