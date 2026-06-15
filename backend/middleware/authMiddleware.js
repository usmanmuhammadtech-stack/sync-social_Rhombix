// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check agar header me Authorization token hai aur wo 'Bearer' se start ho raha hai
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Pehle header ko space se split karenge
      const parts = req.headers.authorization.split(' ');
      
      // Agar 'Bearer' do baar aa gaya ya galti se array ban gaya, toh hum sirf aakhri element uthayenge jo actual token hai
      token = parts[parts.length - 1];

      console.log("Fixed Extracted Token:", token); // Definite string check 🔍

      // Token ko verify karna
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // User ID nikal kar request object me add karna
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (err) {
      console.log("JWT Verification Error:", err.message); // Yeh line add karein 🔍
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token found' });
  }
};

module.exports = { protect };