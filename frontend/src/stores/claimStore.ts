// stores/claimStore.ts
import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface Claim {
    id: string;
    claimNumber: string;
    policyId: string;
    userId: string;
    status: string;
    incidentDate: string;
    incidentDescription: string;
    location: string;
    estimatedAmount: number;
    natureOfLoss: string;
    submittedDate: string;
    createdAt: string;
    updatedAt: string;
}

interface ClaimState {
    claims: Claim[];
    isLoading: boolean;
    fetchClaims: () => Promise<void>;
    getClaimById: (id: string) => Claim | undefined;
}

const getAuthHeaders = () => {
    const token = useAuthStore.getState().token;
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
        const parsed = JSON.parse(stored);
        authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
};

export const useClaimStore = create<ClaimState>((set, get) => ({
    claims: [],
    isLoading: false,
    
    fetchClaims: async () => {
        set({ isLoading: true });
        try {
            const response = await axios.get(`${API_URL}/claims`, {
                headers: getAuthHeaders()
            });
            set({ claims: response.data, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch claims:', error);
            set({ isLoading: false });
        }
    },
    
    getClaimById: (id: string) => {
        return get().claims.find(claim => claim.id === id);
    }
}));