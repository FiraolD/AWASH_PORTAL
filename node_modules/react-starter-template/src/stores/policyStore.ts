// frontend/src/stores/policyStore.ts
import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  status: string;
  coverageAmount: number;
  premium: number;
  createdAt: string;
  effectiveDate: string;
  expirationDate: string;
  policyDocumentPath?: string;
}

interface PolicyState {
  policies: Policy[];
  isLoading: boolean;
  fetchPolicies: () => Promise<void>;
  getPolicyById: (id: string) => Policy | undefined;
}

const getAuthHeaders = () => {
  const stored = localStorage.getItem('awash-auth-storage');
  const token = useAuthStore.getState().token;
  let authToken = token;
  if (!authToken && stored) {
    try {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    } catch (e) {}
  }
  return { Authorization: `Bearer ${authToken}` };
};

export const usePolicyStore = create<PolicyState>((set, get) => ({
  policies: [],
  isLoading: false,
  
  fetchPolicies: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get(`${API_URL}/policies/my-policies`, {
        headers: getAuthHeaders()
      });
      set({ policies: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      set({ isLoading: false });
    }
  },
  
  getPolicyById: (id: string) => {
    return get().policies.find(policy => policy.id === id);
  }
}));