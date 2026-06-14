/**
 * Authentication route definitions — maps HTTP endpoints to controller functions.
 * Mounted in app.js at /api/auth → full paths:
 *   POST /api/auth/register
 *   POST /api/auth/login
 */
const express = require('express');
const authController = require('../controllers/authController');

// Router creates a mini-app with its own middleware and routes
const router = express.Router();

// POST /api/auth/register  →  authController.register
router.post('/register', authController.register);

// POST /api/auth/login  →  authController.login
router.post('/login', authController.login);

module.exports = router;
