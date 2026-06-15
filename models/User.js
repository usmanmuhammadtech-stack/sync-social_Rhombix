// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // User ka profile data hum yahi embed kar rahe hain for speed
  profile: {
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: 'https://via.placeholder.com/150' },
    privacySettings: {
      isPrivate: { type: Boolean, default: false }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password Hashing Middleware (Database me save hone se pehle password encrypt hoga)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Password verification method (Login ke waqt use hoga)
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);