import axios from 'axios';

// Browser requests use the Vercel same-origin proxy. The HttpOnly session
// cookie is therefore first-party and does not depend on third-party cookies.
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || '');
    const isLoginRequest = requestUrl.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      window.dispatchEvent(new Event('awash:unauthorized'));
    }
    return Promise.reject(error);
  }
);
