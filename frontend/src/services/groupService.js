/**
 * Group API calls — frontend mirror of backend group routes.
 * JWT is attached automatically by the api.js request interceptor.
 */
import api from './api';

/**
 * POST /groups  →  backend POST /api/groups
 */
export async function createGroup(name) {
  const response = await api.post('/groups', { name });
  return response.data;
}

/**
 * GET /groups  →  backend GET /api/groups
 */
export async function getAllGroups() {
  const response = await api.get('/groups');
  return response.data;
}

/**
 * GET /groups/:id  →  backend GET /api/groups/:id
 */
export async function getGroupById(id) {
  const response = await api.get(`/groups/${id}`);
  return response.data;
}

/**
 * PUT /groups/:id  →  backend PUT /api/groups/:id
 */
export async function updateGroup(id, name) {
  const response = await api.put(`/groups/${id}`, { name });
  return response.data;
}

/**
 * DELETE /groups/:id  →  backend DELETE /api/groups/:id
 */
export async function deleteGroup(id) {
  const response = await api.delete(`/groups/${id}`);
  return response.data;
}
