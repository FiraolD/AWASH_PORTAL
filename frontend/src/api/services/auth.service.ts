import { apiClient } from '../client.js';

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    apiClient.post('/auth/register', data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),

  getCurrentUser: () =>
    apiClient.get('/auth/me'),
};