import { apiClient } from '../client.js';

export const userService = {
  getUsers: () => apiClient.get('/users'),
  getCustomers: () => apiClient.get('/users/customers'),
  getUserById: (id: string) => apiClient.get(`/users/${id}`),
  createUser: (data: any) => apiClient.post('/users', data),
  updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  updateUserStatus: (id: string, status: string) => apiClient.patch(`/users/${id}/status`, { status }),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};