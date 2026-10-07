// frontend/src/stores/paymentStore.ts
import { create } from 'zustand';
import axios from '../lib/axios';
import { Payment, PaymentMethod } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface PaymentState {
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  fetchPayments: () => Promise<void>;
  fetchPaymentMethods: () => Promise<void>;
  createPayment: (data: any) => Promise<any>;
  createPaymentMethod: (data: any) => Promise<any>;
  deletePaymentMethod: (id: string) => Promise<void>;
}

const getAuthHeaders = () => {
  const stored = localStorage.getItem('awash-auth-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const token = parsed.state?.token;
      if (token) return { Authorization: `Bearer ${token}` };
    } catch (e) {}
  }
  return {};
};

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  paymentMethods: [],
  isLoading: false,
  error: null,

  fetchPayments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/payments`, {
        headers: getAuthHeaders()
      });
      set({ payments: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch payments:', error);
      set({ payments: [], isLoading: false, error: error.response?.data?.error });
    }
  },

  fetchPaymentMethods: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/payments/methods`, {
        headers: getAuthHeaders()
      });
      set({ paymentMethods: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch payment methods:', error);
      set({ paymentMethods: [], isLoading: false, error: error.response?.data?.error });
    }
  },

  createPayment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/payments`, data, {
        headers: getAuthHeaders()
      });
      set((state) => ({
        payments: [response.data, ...state.payments],
        isLoading: false,
      }));
      return response.data;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.error });
      throw error;
    }
  },

  createPaymentMethod: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/payments/methods`, data, {
        headers: getAuthHeaders()
      });
      set((state) => ({
        paymentMethods: [...state.paymentMethods, response.data],
        isLoading: false,
      }));
      return response.data;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.error });
      throw error;
    }
  },

  deletePaymentMethod: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/payments/methods/${id}`, {
        headers: getAuthHeaders()
      });
      set((state) => ({
        paymentMethods: state.paymentMethods.filter(m => m.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.error });
      throw error;
    }
  },
}));