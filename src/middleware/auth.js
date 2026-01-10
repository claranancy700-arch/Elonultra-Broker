const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin_key_12345';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  });
};

// Middleware to verify admin key
const verifyAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  
  next();
};

module.exports = { verifyToken, verifyAdmin };
