import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// --- Services ---
export const registerService = (data) => api.post('/api/services', data);
export const getServices = () => api.get('/api/services');
export const deleteService = (id) => api.delete(`/api/services/${id}`);
export const healthCheck = () => api.get('/api/health');

export default api;
