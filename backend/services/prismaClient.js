/**
 * Shared Prisma client — single database connection for the entire app.
 * Import this file wherever you need to query MySQL (services layer).
 */
const { PrismaClient } = require('@prisma/client');

// One instance for the whole process; all services import this same object.
const prisma = new PrismaClient({
  // Log queries in development to help debug during interviews / local dev.
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;
