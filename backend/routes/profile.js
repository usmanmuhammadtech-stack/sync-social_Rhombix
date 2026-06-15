// routes/profile.js — sirf GET /me aur upload-avatar fix hai, baaki same

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Sirf images allow hain!'));
  }
});

// ==========================================
// 1. GET CURRENT USER PROFILE — fresh fetch
// ==========================================
router.get('/me', protect, async (req, res) => {
  try {
    // req.user ki jagah fresh database fetch — taaki updated avatarUrl mile
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ==========================================
// 2. GET MY POSTS
// ==========================================
router.get('/my-posts', protect, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'username profile')
      .populate('comments.user', 'username');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ==========================================
// 3. UPDATE PROFILE
// ==========================================
router.put('/update', protect, async (req, res) => {
  try {
    const { displayName, bio, isPrivate, location, website, company } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (displayName !== undefined) user.profile.displayName = displayName;
    if (bio !== undefined) user.profile.bio = bio;
    if (isPrivate !== undefined) user.profile.privacySettings.isPrivate = isPrivate;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (company !== undefined) user.company = company;

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ==========================================
// 4. UPLOAD AVATAR — profile.avatarUrl mein save
// ==========================================
router.post('/upload-avatar', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File nahi mili!' });

    const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    const user = await User.findById(req.user._id);

    // Purana avatar delete karo (placeholder nahi)
    if (user.profile?.avatarUrl && user.profile.avatarUrl.includes('/uploads/')) {
      const oldFile = path.join(uploadDir, path.basename(user.profile.avatarUrl));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    // profile.avatarUrl mein save karo
    user.profile.avatarUrl = avatarUrl;
    await user.save();

    res.json({ avatarUrl });
  } catch (err) {
    res.status(500).json({ message: 'Avatar upload nahi hua!', error: err.message });
  }
});

// ==========================================
// 5. UPLOAD COVER
// ==========================================
router.post('/upload-cover', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File nahi mili!' });

    const coverUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    const user = await User.findById(req.user._id);
    if (user.coverUrl && user.coverUrl.includes('/uploads/')) {
      const oldFile = path.join(uploadDir, path.basename(user.coverUrl));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    user.coverUrl = coverUrl;
    await user.save();

    res.json({ coverUrl });
  } catch (err) {
    res.status(500).json({ message: 'Cover upload nahi hua!', error: err.message });
  }
});

// ==========================================
// 6. FOLLOW / UNFOLLOW
// ==========================================
router.put('/follow/:id', protect, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const isFollowing = currentUser.following.includes(req.params.id);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user._id.toString());
      await currentUser.save();
      await targetUser.save();
      return res.json({ message: 'Unfollowed 💔' });
    } else {
      currentUser.following.push(req.params.id);
      targetUser.followers.push(req.user._id);
      await currentUser.save();
      await targetUser.save();
      return res.json({ message: 'Followed ❤️' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;