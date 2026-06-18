import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Try multiple storage locations for the token
    let token = null;
    
    // Check awash-auth-storage (your auth store format)
    const stored = localStorage.getItem('awash-auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        token = parsed.state?.token || parsed.token;
      } catch (e) {
        console.error('Failed to parse awash-auth-storage:', e);
      }
    }
    
    // Fallback to direct token storage
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    // Fallback to session storage
    if (!token) {
      token = sessionStorage.getItem('token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - Redirecting to login');
      
      // Clear all auth storage
      localStorage.removeItem('awash-auth-storage');
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn('403 Forbidden - Insufficient permissions');
      // You could show a toast notification here
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    }
    
    if (!error.response) {
      console.error('Network error - check your connection');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;