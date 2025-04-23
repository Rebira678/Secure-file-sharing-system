const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  path: { 
    type: String, 
    required: true 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sharedWith: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  category: {
    type: String,
    enum: ['documents', 'images', 'other'],
    default: 'other'
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Add text index for search
fileSchema.index({ name: 'text' });

module.exports = mongoose.model('File', fileSchema);