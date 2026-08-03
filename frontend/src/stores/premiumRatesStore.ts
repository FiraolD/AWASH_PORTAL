// src/stores/premiumRatesStore.ts
import { create } from 'zustand';
import axiosInstance from '../lib/axios';

export interface PremiumRate {
  id: string;
  productId: string;
  productType: string;
  coverageTier: string;
  baseRate: number;
  minCoverage: number;
  maxCoverage: number | null;
  riskFactor: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productName?: string;
  productCode?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  isActive: boolean;
}

interface PremiumRatesState {
  rates: PremiumRate[];
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchRates: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  createRate: (data: Partial<PremiumRate>) => Promise<void>;
  updateRate: (id: string, data: Partial<PremiumRate>) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  toggleRateStatus: (id: string) => Promise<void>;
}

export const usePremiumRatesStore = create<PremiumRatesState>((set, get) => ({
  rates: [],
  products: [],
  isLoading: false,
  error: null,

  fetchRates: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get('/premium-rates');
      // API returns camelCase – use directly
      const rates = response.data.map((rate: any) => ({
        ...rate,
        baseRate: parseFloat(rate.baseRate),
        minCoverage: parseFloat(rate.minCoverage),
        maxCoverage: rate.maxCoverage ? parseFloat(rate.maxCoverage) : null,
        riskFactor: parseFloat(rate.riskFactor),
      }));
      set({ rates, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchProducts: async () => {
    try {
      const response = await axiosInstance.get('/products');
      set({ products: response.data });
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
    }
  },

  createRate: async (data: Partial<PremiumRate>) => {
    try {
      await axiosInstance.post('/premium-rates', data);
      get().fetchRates();
    } catch (error: any) {
      throw error;
    }
  },

  updateRate: async (id: string, data: Partial<PremiumRate>) => {
    try {
      await axiosInstance.put(`/premium-rates/${id}`, data);
      get().fetchRates();
    } catch (error: any) {
      throw error;
    }
  },

  deleteRate: async (id: string) => {
    try {
      await axiosInstance.delete(`/premium-rates/${id}`);
      get().fetchRates();
    } catch (error: any) {
      throw error;
    }
  },

  toggleRateStatus: async (id: string) => {
    try {
      await axiosInstance.patch(`/premium-rates/${id}/toggle`);
      get().fetchRates();
    } catch (error: any) {
      throw error;
    }
  },
}));