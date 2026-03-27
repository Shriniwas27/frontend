import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// --- Services ---
export const registerService = (data) => api.post('/api/services', data);
export const getServices = () => api.get('/api/services');
export const updateService = (id, data) => api.put(`/api/services/${id}`, data);
export const updateServiceStatus = (id, status) => api.patch(`/api/services/${id}/status`, { status });
export const deleteService = (id) => api.delete(`/api/services/${id}`);
export const healthCheck = () => api.get('/api/health');

// --- GCP Operations ---
// (Agent-specific GCP operations were pruned from backend)


// --- Global GCP Discovery ---
export const getGlobalGcpProjects = () => api.get('/api/gcp/global/projects');
export const getGlobalGcpServices = (projectId, location) => {
  const url = `/api/gcp/global/services?project_id=${projectId}${location ? `&location=${location}` : ''}`;
  return api.get(url);
};

// Aliases for backward compatibility with component imports
export const getGcpProjects = (agentId) => getGlobalGcpProjects();
export const getGcpServices = (agentId, projectId) => getGlobalGcpServices(projectId);

// --- Auth & Users ---
export const register = (data) => api.post('/api/auth/register', data);
export const login = (data) => api.post('/api/auth/login', data);
export const getUser = (userId) => api.get(`/api/users/${userId}`);

// --- Accounts (Multi-credential) ---
export const createAccount = (data) => api.post('/api/accounts', data);
export const getAccounts = (userId) => api.get(`/api/accounts/${userId}`);

// --- Groups ---
export const createGroup = (data) => api.post('/api/groups', data);
export const getGroups = (userId) => api.get(`/api/groups/${userId}`);
export const updateGroup = (groupId, data) => api.put(`/api/groups/${groupId}`, data);
export const deleteGroup = (groupId) => api.delete(`/api/groups/${groupId}`);

export default api;
