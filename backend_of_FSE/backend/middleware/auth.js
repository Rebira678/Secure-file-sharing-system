const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // ===== DEBUG: Log incoming headers =====
    console.log('\n[DEBUG] Received headers:', JSON.stringify(req.headers, null, 2));
    
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // ===== DEBUG: Show extracted token =====
    console.log('[DEBUG] Extracted token:', token || 'NO TOKEN FOUND');

    if (!token) {
      throw new Error('Authorization header missing');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ===== DEBUG: Show decoded token =====
    console.log('[DEBUG] Decoded token:', JSON.stringify(decoded, null, 2));

    // Attach user data to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };
    
    next();
  } catch (err) {
    // ===== DEBUG: Show full error =====
    console.error('[DEBUG] Auth error:', err.stack);
    
    res.status(401).json({ 
      error: 'Please authenticate',
      // Only show details in development
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
