import { apiClient } from '../client.js';

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; address?: string }) =>
    apiClient.post('/auth/signup', data),

  resendActivation: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),

  getCurrentUser: () =>
    apiClient.get('/auth/me'),
};