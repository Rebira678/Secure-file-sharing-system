require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Enhanced Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// i add this now for categories
app.use('/api/files', require('./routes/fileCategories'));
// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));





/////////////////////////////////////////////////////////
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);



















// In your users routes file
const multer = require('multer');
const upload = multer({ dest: 'uploads/avatars/' });

