import { apiClient } from '../client.js';

export const dashboardService = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getActivities: () => apiClient.get('/dashboard/activities'),
};