// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Uploads folder static serve
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/posts', require('./routes/post'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

// Health Check
app.get('/', (req, res) => {
  res.send('Social Network Backend is Running! 🚀');
});

// Multer error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size 5MB se zyada nahi honi chahiye!' });
  }
  if (err.message === 'Sirf images allow hain!') {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB! 🍃');
    app.listen(PORT, () => {
      console.log(`Server is running smoothly on port ${PORT} 💻`);
    });
  })
  .catch((err) => {
    console.error('Database connection error ❌:', err.message);
  });