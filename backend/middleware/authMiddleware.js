/**
 * JWT authentication middleware — protects routes that require a logged-in user.
 * Used on group, expense, and dashboard routes; not on public auth routes.
 */
const jwt = require('jsonwebtoken');

/**
 * Reads the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded user payload to req.user before calling next().
 */
function authMiddleware(req, res, next) {
  // Header format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
  const authHeader = req.headers.authorization;

  // No header or wrong scheme → reject immediately
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  // Strip "Bearer " prefix to get the raw JWT string
  const token = authHeader.split(' ')[1];

  try {
    // Verify signature and expiry using the secret from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach { id, email } so downstream controllers know who is calling
    req.user = decoded;

    // Hand off to the next middleware or route handler
    next();
  } catch (error) {
    // jwt.verify throws on expired, tampered, or malformed tokens
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
}

module.exports = authMiddleware;
