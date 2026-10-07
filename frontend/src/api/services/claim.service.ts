import { apiClient } from '../client.js';

export const claimService = {
  getMyClaims: () => apiClient.get('/claims'),
  getClaimQueue: () => apiClient.get('/claims/queue'),
  createClaim: (data: any) => apiClient.post('/claims', data),
  updateClaimStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/claims/${id}/status`, { status, notes }),
  getClaimDetails: (id: string) => apiClient.get(`/claims/${id}`),
};