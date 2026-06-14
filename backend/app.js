/**
 * Express application configuration — middleware, routes, and error handling.
 * Does NOT start the server; server.js imports this file and calls app.listen().
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Global middleware (order matters — runs top to bottom on every request) ──

// Allow React frontend (different port) to call this API
app.use(cors());

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// ── Health check — confirms the API is up before testing auth routes ─────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Expense Tracker API Running',
  });
});

// ── Route mounting — each router handles a feature area ──────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);

// ── Error handler MUST be last — catches errors from all routes above ────────
app.use(errorHandler);

module.exports = app;
