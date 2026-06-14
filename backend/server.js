/**
 * Application entry point — starts the HTTP server.
 * Loads app configuration from app.js and listens on PORT from .env.
 */
const app = require('./app');

// Fallback to 5000 if PORT is not set in .env
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle fatal startup errors (e.g. port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use.`);
  } else {
    console.error('Failed to start server:', err.message);
  }
  process.exit(1);
});
