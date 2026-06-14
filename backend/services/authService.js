/**
 * Authentication business logic — register and login.
 * Controllers call these functions; this layer talks to Prisma and bcrypt/JWT.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('./prismaClient');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]{1,49}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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

function isValidName(name) {
  return NAME_REGEX.test(name.trim());
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email.trim());
}

function isStrongPassword(password) {
  return PASSWORD_REGEX.test(password);
}

/**
 * Register a new user.
 * 1. Validate input
 * 2. Check email uniqueness
 * 3. Hash password
 * 4. Persist to MySQL via Prisma
 */
async function registerUser({ name, email, password }) {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();

  if (!trimmedName) {
    throw validationError('Name is required');
  }
  if (!isValidName(trimmedName)) {
    throw validationError('Name must contain only letters and valid separators, and be 2 to 50 characters long');
  }
  if (!trimmedEmail) {
    throw validationError('Email is required');
  }
  if (!isValidEmail(trimmedEmail)) {
    throw validationError('Please enter a valid email address');
  }
  if (!password) {
    throw validationError('Password is required');
  }
  if (!isStrongPassword(password)) {
    throw validationError('Password must be at least 8 characters and include at least one letter, one number, and one special character');
  }

  const normalizedEmail = trimmedEmail.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw validationError('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
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
  const trimmedEmail = email?.trim();

  if (!trimmedEmail) {
    throw validationError('Email is required');
  }
  if (!isValidEmail(trimmedEmail)) {
    throw validationError('Please enter a valid email address');
  }
  if (!password) {
    throw validationError('Password is required');
  }

  const normalizedEmail = trimmedEmail.toLowerCase();

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
