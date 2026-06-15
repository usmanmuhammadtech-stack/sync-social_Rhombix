// models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  // Kis user ne post kiya (User Model se link)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Post ka text content
  content: {
    type: String,
    // 🎯 STEP 1 FIX: 'required: true' ko hata diya taaki akeli image bhi post ho sake!
    trim: true,
    maxlength: [500, 'Post content cannot exceed 500 characters']
  },
  // Post me agar koi image link ho (Optional)
  imageUrl: {
    type: String,
    default: ''
  },
  // Likes ki array (Isme un users ki IDs aayengi jinhone like kiya)
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  // Comments ki array (Har comment ke andar user, text aur timestamp hoga)
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      text: {
        type: String,
        required: true,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  // Post kab bani ya kab update hui, iske liye automatic timestamps
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);