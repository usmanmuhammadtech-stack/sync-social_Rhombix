const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) { cb(null, Date.now() + path.extname(file.originalname)); }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed!'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// 1. IMAGE UPLOAD
router.post('/upload-image', protect, (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) return res.status(400).json({ message: `Multer error: ${err.message}` });
    else if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
  });
});

// 2. GET ALL POSTS
router.get('/', protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'username profile')
      .populate('comments.user', 'username')
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 3. CREATE POST
router.post('/', protect, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    if ((!content || !content.trim()) && !imageUrl) {
      return res.status(400).json({ message: 'Post cannot be empty.' });
    }
    const userId = req.user.id || req.user._id;
    let newPost = new Post({ user: userId, content: content ? content.trim() : '', imageUrl: imageUrl || '' });
    await newPost.save();
    newPost = await newPost.populate('user', 'username profile');
    res.status(201).json(newPost);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 4. EDIT POST
router.put('/:id/edit', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = (req.user.id || req.user._id).toString();
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: 'Sirf apni post edit kar sakte ho!' });
    }
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content empty nahi ho sakta!' });
    }
    post.content = content.trim();
    await post.save();
    const updatedPost = await Post.findById(post._id)
      .populate('user', 'username profile')
      .populate('comments.user', 'username');
    res.status(200).json(updatedPost);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 5. DELETE POST
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = (req.user.id || req.user._id).toString();
    if (post.user.toString() !== userId) {
      return res.status(403).json({ message: 'Sirf apni post delete kar sakte ho!' });
    }
    if (post.imageUrl && post.imageUrl.includes('/uploads/')) {
      const imgPath = path.join(__dirname, '../uploads', path.basename(post.imageUrl));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await post.deleteOne();
    res.status(200).json({ message: 'Post delete ho gayi!', postId: req.params.id });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 6. LIKE / UNLIKE + NOTIFICATION
router.put('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = req.user.id || req.user._id;
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
      // Notification — apni post pe like nahi
      if (post.user.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.user,
          sender: userId,
          type: 'like',
          post: post._id
        });
      }
    }
    await post.save();
    res.status(200).json({ likes: post.likes });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 7. ADD COMMENT + NOTIFICATION
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment empty nahi ho sakta' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = req.user.id || req.user._id;
    post.comments.push({ user: userId, text });
    await post.save();

    // Notification — apni post pe comment nahi
    if (post.user.toString() !== userId.toString()) {
      await Notification.create({
        recipient: post.user,
        sender: userId,
        type: 'comment',
        post: post._id
      });
    }

    const updatedPost = await Post.findById(req.params.id)
      .populate('user', 'username profile')
      .populate('comments.user', 'username');
    res.status(201).json(updatedPost.comments);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 8. SUGGESTIONS
router.get('/suggestions/creators', protect, async (req, res) => {
  try {
    const loggedInUserId = req.user.id || req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select('username email followers following');
    res.status(200).json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 9. FOLLOW / UNFOLLOW + NOTIFICATION
router.put('/user/:id/follow', protect, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const loggedInUserId = req.user.id || req.user._id;
    if (targetUserId === loggedInUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }
    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(loggedInUserId);
    if (!targetUser || !currentUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.followers.includes(loggedInUserId)) {
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== loggedInUserId.toString());
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId.toString());
    } else {
      targetUser.followers.push(loggedInUserId);
      currentUser.following.push(targetUserId);
      // Follow notification
      await Notification.create({
        recipient: targetUserId,
        sender: loggedInUserId,
        type: 'follow',
        post: null
      });
    }
    await targetUser.save();
    await currentUser.save();
    res.status(200).json({ following: currentUser.following });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 10. SEARCH
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ message: 'Search query required' });
    const regex = new RegExp(q.trim(), 'i');
    const users = await User.find({ username: { $regex: regex } })
      .select('username email profile followers following').limit(5);
    const posts = await Post.find({ content: { $regex: regex } })
      .populate('user', 'username profile')
      .populate('comments.user', 'username')
      .sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ users, posts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;