const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/users');

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
    try {
        // Check if user is admin
        const requestingUser = await User.findById(req.user.id);
        if (!requestingUser.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;