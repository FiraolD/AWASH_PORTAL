import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    let token = null;

    const stored = localStorage.getItem('awash-auth-storage');

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        token = parsed.state?.token || parsed.token;
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
      }
    }

    if (!token) {
      token = localStorage.getItem('token');
    }

    if (!token) {
      token = sessionStorage.getItem('token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {

    if (error.response?.status === 401) {
      localStorage.removeItem('awash-auth-storage');
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);


export default axiosInstance;