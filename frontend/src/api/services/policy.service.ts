import { apiClient } from '../client.js';

export const policyService = {
  getMyPolicies: () => apiClient.get('/policies'),
  getPendingPolicies: () => apiClient.get('/policies/pending'),
  getPolicyForReview: (id: string) => apiClient.get(`/policies/${id}/review`),
  createPolicy: (data: any) => apiClient.post('/policies', data),
  approvePolicy: (id: string, notes?: string) => apiClient.post(`/policies/${id}/approve`, { notes }),
  rejectPolicy: (id: string, reason: string) => apiClient.post(`/policies/${id}/reject`, { reason }),
  calculatePremium: (data: any) => apiClient.post('/policies/calculate-premium', data),
};