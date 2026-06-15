// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==========================================
// 1. REGISTER ROUTE (POST http://localhost:5000/api/auth/register)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check agar user pehle se exist karta hai
    let userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or Email already registered' });
    }

    // Naya User create kiya (password auto-hash ho jayega pre-save middleware se)
    const newUser = new User({
      username,
      email,
      password,
      profile: {
        displayName: displayName || username, // Default to username if empty
        bio: '',
        avatarUrl: 'https://via.placeholder.com/150'
      }
    });

    await newUser.save();

    // JWT Token generate karna
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d', // Token 7 din tak valid rahega
    });

    res.status(201).json({
      message: 'User registered successfully! 🎉',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profile: newUser.profile
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ==========================================
// 2. LOGIN ROUTE (POST http://localhost:5000/api/auth/login)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user exists or not
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Password check karna (comparePassword method call kiya jo model me banaya tha)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // JWT Token generate karna
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      message: 'Logged in successfully! 👋',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router;