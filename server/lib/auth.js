'use strict';
const crypto = require('crypto');

// ─── AUTH CONFIGURATION ──────────────────────────────────────────────────────
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'vent-prototype-secret-' + (process.env.SUPABASE_KEY || '').slice(0, 12);
const TOKEN_EXPIRY_HOURS = 24;

// Create HMAC-signed token
function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_HOURS * 3600)
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + sig;
}

// Verify token — returns payload or null
function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(header + '.' + body).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// Hash password with salt
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Verify password
function verifyPassword(password, hash, salt) {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

// Auth middleware — extracts user from token, attaches to req.user
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Demo mode: bypass JWT verification, inject admin user
    if (token === 'demo') {
      req.user = { id: 'demo-user', email: 'demo@vent.app', name: 'Demo Admin', role: 'admin' };
    } else {
      const user = verifyToken(token);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

// Require auth — rejects if no valid token
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Require specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Required: ' + roles.join(' or ') });
    }
    next();
  };
}

module.exports = {
  createToken, verifyToken, hashPassword, verifyPassword,
  authMiddleware, requireAuth, requireRole
};
