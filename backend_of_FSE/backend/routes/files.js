const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const Request = require('../models/Request'); // Add this line
const auth = require('../middleware/auth');

// Configure file storage with limits and filters
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, TXT, or DOCX files are allowed'), false);
    }
  }
});

// ===== UPDATED ROUTES ===== //

// Upload File (Admin Only)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can upload files' });
    }

    const newFile = new File({
      name: req.file.originalname,
      path: req.file.path,
      owner: req.user.userId,
      isPublic: req.body.isPublic || false // Add public/private flag
    });

    await newFile.save();
    res.status(201).json(newFile);

  } catch (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 10MB)' });
      }
    }
    res.status(500).json({ error: err.message });
  }
});

// ===== NEW REQUEST SYSTEM ===== //

// Request file access
router.post('/:id/request', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Check if already has access
    if (file.isPublic || file.owner.equals(req.user.userId) || 
        file.sharedWith.some(id => id.equals(req.user.userId))) {
      return res.status(400).json({ error: 'You already have access to this file' });
    }

    // Check for existing request
    const existingRequest = await Request.findOne({
      file: file._id,
      requester: req.user.userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this file' });
    }

    const request = new Request({
      file: file._id,
      requester: req.user.userId,
      owner: file.owner,
      status: 'pending',
      message: req.body.message || ''
    });

    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending requests (for file owners)
router.get('/requests/pending', auth, async (req, res) => {
  try {
    const requests = await Request.find({
      owner: req.user.userId,
      status: 'pending'
    }).populate('file', 'name').populate('requester', 'email');
    
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle request (approve/reject)
router.patch('/requests/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('file');
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Verify request owner
    if (!request.owner.equals(req.user.userId)) {
      return res.status(403).json({ error: 'Not authorized to handle this request' });
    }

    // Update status
    request.status = req.body.status; // 'approved' or 'rejected'
    request.processedAt = new Date();
    await request.save();

    // If approved, grant access
    if (request.status === 'approved') {
      await File.findByIdAndUpdate(request.file._id, {
        $addToSet: { sharedWith: request.requester }
      });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== EXISTING ROUTES (UPDATED FOR REQUEST SYSTEM) ===== //

// List Files (Updated to include public files)
router.get('/', auth, async (req, res) => {
  try {
    const files = await File.find({ 
      $or: [
        { owner: req.user.userId },
        { sharedWith: req.user.userId },
        { isPublic: true }
      ]
    }).select('-__v');
    
    res.json(files.map(file => ({
      ...file.toObject(),
      canRequest: !file.owner.equals(req.user.userId) && 
                 !file.sharedWith.some(id => id.equals(req.user.userId)) &&
                 !file.isPublic
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get File Details (Updated with request info)
router.get('/:id', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) return res.status(404).json({ error: 'File not found' });

    const hasAccess = file.isPublic || 
                     file.owner.equals(req.user.userId) || 
                     file.sharedWith.some(id => id.equals(req.user.userId));

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        canRequest: true // Indicate they can request access
      });
    }

    res.json({
      ...file.toObject(),
      size: fs.statSync(file.path).size,
      downloadUrl: `/api/files/${file._id}/download`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... (Keep all your existing routes below - delete, share, download etc.)

module.exports = router;






















































router.post('/upload', auth, async (req, res) => {
  try {
      if (!req.files) return res.status(400).send('No file uploaded');
      
      const file = req.files.file;
      const filePath = `uploads/${req.user.id}/${req.body.category}/${file.name}`;
      
      await file.mv(filePath);
      
      const newFile = new File({
          name: file.name,
          path: filePath,
          owner: req.user.id,
          category: req.body.category
      });
      
      await newFile.save();
      res.json(newFile);
  } catch (err) {
      res.status(500).send('Server error');
  }
});

router.get('/', auth, async (req, res) => {
  try {
      const files = await File.find({
          owner: req.user.id,
          category: req.query.category || 'all'
      });
      res.json(files);
  } catch (err) {
      res.status(500).send('Server error');
  }
});



const upload = multer({ storage: storage });

// Upload endpoint
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const newFile = new File({
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      owner: req.user.id,
      category: req.body.category || 'documents'
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get files endpoint
router.get('/list', auth, async (req, res) => {
  try {
    const files = await File.find({ owner: req.user.id });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});