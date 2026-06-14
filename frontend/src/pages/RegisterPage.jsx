/**
 * Register page — name, email, password + confirm password.
 * On success redirects to /login (backend register does not return a JWT).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]{1,49}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!NAME_REGEX.test(name.trim())) {
      setError('Name must contain only letters and valid separators, and be 2 to 50 characters long');
      return;
    }
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError('Password must be at least 8 characters and include at least one letter, one number, and one special character');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            ET
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">Start tracking shared expenses</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ chars, 1 letter, 1 number, 1 special char"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 pr-12 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                    <path d="M9.88 5.09A10.94 10.94 0 0112 5c5.5 0 9.5 4.5 10.5 7-0.48 1.19-1.35 2.54-2.48 3.78" />
                    <path d="M6.61 6.61C4.04 8.19 2.48 11 1.5 12c1 2.5 5 7 10.5 7 1.2 0 2.35-.14 3.42-.41" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 pr-12 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700"
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                    <path d="M9.88 5.09A10.94 10.94 0 0112 5c5.5 0 9.5 4.5 10.5 7-0.48 1.19-1.35 2.54-2.48 3.78" />
                    <path d="M6.61 6.61C4.04 8.19 2.48 11 1.5 12c1 2.5 5 7 10.5 7 1.2 0 2.35-.14 3.42-.41" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
