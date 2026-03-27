import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
export const AUTH_TOKEN_KEY = 'cybermedic_token';
export const AUTH_USER_KEY = 'cybermedic_user';

if (!API_BASE_URL) {
  throw new Error('Missing VITE_BACKEND_URL in frontend .env file');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const storeAuthSession = (user, token) => {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// --- Services ---
export const registerService = (data) => api.post('/api/services', data);
export const getServices = (userId) =>
  api.get('/api/services', { params: userId ? { user_id: userId } : {} });
export const updateService = (id, data) => api.put(`/api/services/${id}`, data);
export const updateServiceStatus = (id, status) => api.patch(`/api/services/${id}/status`, { status });
export const deleteService = (id) => api.delete(`/api/services/${id}`);
export const healthCheck = () => api.get('/api/health');

// --- GCP Operations ---
// (Agent-specific GCP operations were pruned from backend)


// --- Global GCP Discovery ---
export const getGlobalGcpProjects = (userId) => api.get(`/api/projects/${userId}`);
export const getGlobalGcpServices = (userId, projectId, location) => {
  const url = `/api/projects/${userId}/services?project_id=${projectId}${location ? `&location=${location}` : ''}`;
  return api.get(url);
};

// Aliases for backward compatibility with component imports
export const getGcpProjects = (userId) => getGlobalGcpProjects(userId);
export const getGcpServices = (userId, projectId, location) => getGlobalGcpServices(userId, projectId, location);

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
