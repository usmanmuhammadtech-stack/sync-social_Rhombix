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
  profile: {
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: 'https://via.placeholder.com/150' },
    privacySettings: {
      isPrivate: { type: Boolean, default: false }
    }
  },
  // Naye fields added
  location: { type: String, default: '' },
  website:  { type: String, default: '' },
  company:  { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  followers: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ],
  following: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ]
}, { timestamps: true });

// Password Hashing Middleware
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Password verification method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);