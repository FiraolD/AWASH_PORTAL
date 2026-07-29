// In frontend/src/stores/premiumRatesStore.ts

import { create } from 'zustand';
import axiosInstance from '../lib/axios';

export interface PremiumRate {
  id: string;
  product_id: string;  // Required - foreign key to products
  product_type: string;
  product_name?: string;
  coverage_tier: string;
  baseRate: number;
  min_coverage: number;
  max_coverage: number | null;
  risk_factor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  is_active: boolean;
}

interface PremiumRatesState {
  rates: PremiumRate[];
  products: Product[];
  isLoading: boolean;
  fetchRates: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  createRate: (data: any) => Promise<void>;
  updateRate: (id: string, data: any) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  toggleRateStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const usePremiumRatesStore = create<PremiumRatesState>((set, get) => ({
  rates: [],
  products: [],
  isLoading: false,

  fetchRates: async () => {
    set({ isLoading: true });
    try {
      const response = await axiosInstance.get('/premium-rates');
      set({ rates: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch premium rates:', error);
      set({ rates: [], isLoading: false });
    }
  },

  fetchProducts: async () => {
    try {
      const response = await axiosInstance.get('/products');
      set({ products: response.data });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      set({ products: [] });
    }
  },

  createRate: async (data) => {
    const response = await axiosInstance.post('/premium-rates', data);
    set((state) => ({ rates: [...state.rates, response.data] }));
  },

  updateRate: async (id, data) => {
    const response = await axiosInstance.put(`/premium-rates/${id}`, data);
    set((state) => ({
      rates: state.rates.map((rate) => rate.id === id ? response.data : rate)
    }));
  },

  deleteRate: async (id) => {
    await axiosInstance.delete(`/premium-rates/${id}`);
    set((state) => ({
      rates: state.rates.filter((rate) => rate.id !== id)
    }));
  },

  toggleRateStatus: async (id, isActive) => {
    const response = await axiosInstance.patch(`/premium-rates/${id}/toggle`, { is_active: isActive });
    set((state) => ({
      rates: state.rates.map((rate) => 
        rate.id === id ? response.data : rate
      )
    }));
  },
}));