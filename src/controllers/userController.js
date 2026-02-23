const User = require('../models/User');

// PUT /api/user/profile — update name
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated.',
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/user/avatar — update avatar (base64)
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body; // base64 data URL or null

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatar || null },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: avatar ? 'Avatar updated.' : 'Avatar removed.',
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { updateProfile, updateAvatar };
