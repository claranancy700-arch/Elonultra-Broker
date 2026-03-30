const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin_key_12345';

const isAuthBypassEnabled = () => {
  const bypassRequested = process.env.DISABLE_AUTH === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  // Never allow auth bypass in production to avoid forcing all users to DEV_USER_ID.
  if (bypassRequested && isProduction) {
    return false;
  }

  return bypassRequested;
};

// Middleware to verify JWT token
// When DISABLE_AUTH=true (local testing), skip token verification and inject a dev user
const verifyToken = (req, res, next) => {
  if (isAuthBypassEnabled()) {
    req.userId = Number(process.env.DEV_USER_ID || 1);
    req.userEmail = process.env.DEV_USER_EMAIL || 'dev@local';
    return next();
  }

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
  // Allow admin bypass only when auth bypass is explicitly enabled outside production.
  if (isAuthBypassEnabled()) return next();

  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  
  next();
};

module.exports = { verifyToken, verifyAdmin };
