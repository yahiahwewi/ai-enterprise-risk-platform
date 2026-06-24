import axios from 'axios';

// Single source of truth for the API base URL. Set REACT_APP_API_URL in
// production (e.g. on Vercel) to the deployed backend, e.g.
// https://tactic-backend.<hash>.azurecontainerapps.io/api
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
