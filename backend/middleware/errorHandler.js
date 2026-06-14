/**
 * Centralized Express error-handling middleware.
 * Register this LAST in app.js — after all routes and other middleware.
 *
 * Controllers/services throw or call next(err); this file formats every failure
 * into a consistent JSON response.
 */
const { Prisma } = require('@prisma/client');

/**
 * Express error middleware — identified by exactly 4 parameters: (err, req, res, next).
 * Normal middleware has 3 params; the extra `err` tells Express to run this on failures.
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // ── Validation errors (thrown manually from services/controllers) ──────────
  // Example: throw Object.assign(new Error('Email is required'), { statusCode: 400, name: 'ValidationError' })
  if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  // ── Prisma: invalid query shape or wrong field types ───────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  // ── Prisma: known database errors (unique constraint, not found, etc.) ───
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint failed — e.g. duplicate email on register
        statusCode = 409;
        message = 'A record with this value already exists';
        break;
      case 'P2021':
        // Table does not exist — migrations not applied
        statusCode = 503;
        message = 'Database tables are not set up. Run: npx prisma migrate dev';
        break;
      case 'P2025':
        // Record to update/delete was not found
        statusCode = 404;
        message = 'Record not found';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
    }
  }

  // ── Prisma: connection / engine failures ─────────────────────────────────
  if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = 'Database connection failed. Check MySQL is running and DATABASE_URL in .env';
  }

  // Hide raw internal errors in production (e.g. undefined findUnique)
  if (statusCode === 500 && process.env.NODE_ENV !== 'development') {
    if (message.includes('findUnique') || message.includes('Prisma client')) {
      message = 'Server configuration error. Run: npx prisma generate && npx prisma migrate dev';
    } else {
      message = 'Internal server error';
    }
  }

  // ── Build JSON response ───────────────────────────────────────────────────
  const response = {
    success: false,
    message,
  };

  // Expose stack trace only in development — never leak internals in production
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // If headers were already sent (e.g. streaming), delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
