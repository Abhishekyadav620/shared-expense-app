/**
 * Application entry point — starts the HTTP server.
 * Loads app configuration from app.js and listens on PORT from .env.
 */
require('dotenv').config();

const app = require('./app');
const prisma = require('./services/prismaClient');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection before accepting requests
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Make sure MySQL is running, then run: npx prisma migrate dev');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${PORT} is already in use.`);
    } else {
      console.error('Failed to start server:', err.message);
    }
    process.exit(1);
  });
}

startServer();
