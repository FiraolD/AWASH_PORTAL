// src/lib/axios.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const axiosInstance = axios.create({
  baseURL: '/api', // change to 'http://localhost:5001/api' if proxy not configured
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request interceptor: attach token from store ---
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token; // or however you store the token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response interceptor: handle 401 (unauthorized) ---
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Automatically log out the user (clear token, redirect to login)
      useAuthStore.getState().logout?.(); // if your store has a logout action
      window.location.href = '/login';   // or use your router's navigate
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;