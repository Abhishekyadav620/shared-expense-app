/**
 * Authentication HTTP handlers — thin layer between routes and authService.
 * Reads req.body, calls service functions, sends JSON responses.
 */
const authService = require('../services/authService');

/**
 * POST /api/auth/register
 * Accepts { name, email, password } and creates a new user account.
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const user = await authService.registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Accepts { email, password } and returns a JWT + user profile.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { user, token } = await authService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
};
