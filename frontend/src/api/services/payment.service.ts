import { apiClient } from '../client.js';

export const paymentService = {
  getMyPayments: () => apiClient.get('/payments'),
  getPaymentMethods: () => apiClient.get('/payments/methods'),
  createPaymentMethod: (data: any) => apiClient.post('/payments/methods', data),
  deletePaymentMethod: (id: string) => apiClient.delete(`/payments/methods/${id}`),
};