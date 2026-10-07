import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axiosInstance from '../lib/axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone?: string;
  avatarUrl?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      // Store token in multiple places for redundancy
      set({ user, token, isAuthenticated: true, isLoading: false });
      localStorage.setItem('awash-auth-storage', JSON.stringify({ state: { token, user } }));
      localStorage.setItem('token', token);
      sessionStorage.setItem('token', token);
      
    } catch (error: any) {
      set({ isLoading: false });
      throw error.response?.data?.error || 'Login failed';
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.post('/auth/register', data);
      const { user, token } = response.data;
      
      set({ user, token, isAuthenticated: true, isLoading: false });
      localStorage.setItem('awash-auth-storage', JSON.stringify({ state: { token, user } }));
      localStorage.setItem('token', token);
      
    } catch (error: any) {
      set({ isLoading: false });
      throw error.response?.data?.error || 'Registration failed';
    }
  },

  updateUser: (updates: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const user = { ...current, ...updates };
    set({ user });
    const token = get().token;
    localStorage.setItem('awash-auth-storage', JSON.stringify({ state: { token, user } }));
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    localStorage.removeItem('awash-auth-storage');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get('/auth/me');
      const user = response.data;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false, isAuthenticated: false });
      get().logout();
    }
  },
    }),
    {
      name: 'awash-auth-storage',
    }
  )
);


