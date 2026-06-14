/**
 * Authentication business logic — register and login.
 * Controllers call these functions; this layer talks to Prisma and bcrypt/JWT.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('./prismaClient');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

/**
 * Build a consistent validation error that errorHandler.js understands.
 */
function validationError(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.statusCode = 400;
  return error;
}

/**
 * Remove password hash before sending user data to the client.
 */
function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Register a new user.
 * 1. Validate input
 * 2. Check email uniqueness
 * 3. Hash password
 * 4. Persist to MySQL via Prisma
 */
async function registerUser({ name, email, password }) {
  if (!name || !name.trim()) {
    throw validationError('Name is required');
  }
  if (!email || !email.trim()) {
    throw validationError('Email is required');
  }
  if (!password || password.length < 6) {
    throw validationError('Password must be at least 6 characters');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw validationError('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    },
  });

  return sanitizeUser(user);
}

/**
 * Authenticate an existing user and issue a JWT.
 * 1. Validate input
 * 2. Find user by email
 * 3. Compare plain password with stored hash
 * 4. Sign token with { id, email } payload
 */
async function loginUser({ email, password }) {
  if (!email || !email.trim()) {
    throw validationError('Email is required');
  }
  if (!password) {
    throw validationError('Password is required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw validationError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw validationError('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    user: sanitizeUser(user),
    token,
  };
}

module.exports = {
  registerUser,
  loginUser,
};
