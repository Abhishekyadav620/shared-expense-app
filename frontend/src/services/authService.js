/**
 * Authentication API calls — frontend mirror of backend auth routes.
 * Components never call axios directly; they go through AuthContext → here.
 */
import api from './api';

/**
 * POST /auth/register  →  backend POST /api/auth/register
 */
export async function register(name, email, password) {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
}

/**
 * POST /auth/login  →  backend POST /api/auth/login
 */
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}
