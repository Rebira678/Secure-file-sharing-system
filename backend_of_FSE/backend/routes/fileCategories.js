const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'other';
    const uploadPath = path.join(__dirname, `../uploads/${category}`);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/upload-category', auth, upload.single('file'), async (req, res) => {
  try {
    const file = new File({
      name: req.file.originalname,
      path: req.file.path,
      owner: req.user.userId,
      category: req.body.category,
      size: req.file.size,
      type: req.file.mimetype
    });

    await file.save();
    res.status(201).send(file);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;
///////////////////////////////////////////////////////////////////////



// Get files by category
router.get('/list', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const query = { 
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
        { isPublic: true }
      ]
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Add download URLs
    const processedFiles = files.map(file => ({
      ...file,
      downloadUrl: `/api/files/download/${file._id}`,
      category: file.category || 'other'
    }));

    res.json(processedFiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk category update
router.patch('/update-category', auth, async (req, res) => {
  try {
    const { fileIds, category } = req.body;
    
    if (!Array.isArray(fileIds) || !['documents', 'images', 'other'].includes(category)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const result = await File.updateMany(
      { 
        _id: { $in: fileIds },
        owner: req.user.userId // Only owner can change categories
      },
      { $set: { category } }
    );

    res.json({ updatedCount: result.nModified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;