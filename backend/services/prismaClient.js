/**
 * Shared Prisma client — single database connection for the entire app.
 * Import this file wherever you need to query MySQL (services layer).
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Fail fast if Prisma client was not generated from the current schema
if (!prisma.user) {
  throw new Error(
    'Prisma client is not initialized. Run: npx prisma generate'
  );
}

module.exports = prisma;
