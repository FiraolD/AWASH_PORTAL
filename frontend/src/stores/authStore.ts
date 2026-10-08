import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient as axiosInstance } from '../api/client';

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
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { user } = response.data;
      
      set({ user, isAuthenticated: true, isLoading: false });
      
    } catch (error: any) {
      set({ isLoading: false });
      throw error.response?.data?.error || 'Login failed';
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.post('/auth/signup', data);
      const { user } = response.data;

      // Accounts require email verification before authentication.
      set({ user, isAuthenticated: false, isLoading: false });
      
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

  },

  logout: () => {
    void axiosInstance.post('/auth/logout').catch(() => undefined);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get('/auth/profile');
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
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);


