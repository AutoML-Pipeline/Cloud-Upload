import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true, // include cookies for refresh token
});

// Attach Authorization header if access token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests = [];

function onRefreshed(newToken) {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            original.headers = original.headers || {};
            if (token) original.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      try {
        isRefreshing = true;
        const { data } = await api.post('/auth/refresh');
        const newToken = data?.access_token;
        if (newToken) {
          localStorage.setItem('auth_token', newToken);
        }
        onRefreshed(newToken);
        original.headers = original.headers || {};
        if (newToken) original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        // Refresh failed -> clear tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('access_token');
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
