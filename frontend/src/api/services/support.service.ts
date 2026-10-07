import { apiClient } from '../client.js';

export const supportService = {
  getMyTickets: () => apiClient.get('/support/tickets'),
  getAllTickets: () => apiClient.get('/support/admin/tickets'),
  createTicket: (data: any) => apiClient.post('/support/tickets', data),
  getTicketDetails: (ticketId: string) => apiClient.get(`/support/tickets/${ticketId}`),
  addResponse: (ticketId: string, message: string) =>
    apiClient.post(`/support/tickets/${ticketId}/responses`, { message }),
  updateTicketStatus: (ticketId: string, status: string) =>
    apiClient.patch(`/support/admin/tickets/${ticketId}/status`, { status }),
};