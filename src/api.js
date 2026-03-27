import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
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
export const getGcpProjects = (agentId) => api.get(`/api/gcp/${agentId}/projects`);
export const getGcpServices = (agentId, projectId) => api.get(`/api/gcp/${agentId}/services?project_id=${projectId}`);

// --- Global Settings & GCP ---
export const saveGlobalCredentials = (data) => api.post('/api/settings/credentials', data);
export const checkGlobalCredentials = () => api.get('/api/settings/credentials');
export const getGlobalGcpProjects = () => api.get('/api/gcp/global/projects');
export const getGlobalGcpServices = (projectId) => api.get(`/api/gcp/global/services?project_id=${projectId}`);

export default api;
