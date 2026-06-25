const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// 1. GET ALL USERS (chat list ke liye)
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username profile followers following');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. GET CONVERSATION between two users
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
    .populate('sender', 'username profile')
    .populate('receiver', 'username profile')
    .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. SEND MESSAGE
router.post('/send', protect, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message empty nahi ho sakta' });
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text: text.trim()
    });
    const populated = await Message.findById(message._id)
      .populate('sender', 'username profile')
      .populate('receiver', 'username profile');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. UNREAD COUNT
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. MARK MESSAGES AS READ
router.put('/mark-read/:userId', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'Messages read ho gaye!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;