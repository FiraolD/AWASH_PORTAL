import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

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
  /** Deprecated compatibility field. Browser sessions use an HttpOnly cookie. */
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
      isLoading: true,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/login', { email, password });
          // The server sets the HttpOnly cookie; no JWT is exposed to JavaScript.
          set({ user: response.data.user, token: null, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.error || 'Login failed';
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/signup', data);
          set({ user: response.data.user, token: null, isAuthenticated: false, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false });
          throw error.response?.data?.error || 'Registration failed';
        }
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      },

      logout: () => {
        void apiClient.post('/auth/logout').catch(() => undefined);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      // Revalidate the server-managed session on every page load. Persisted
      // profile data is only a UI cache and never grants access by itself.
      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const response = await apiClient.get('/auth/profile');
          set({ user: response.data, token: null, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'awash-auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
