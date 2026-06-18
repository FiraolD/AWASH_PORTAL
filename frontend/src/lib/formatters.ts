export const formatters = {
  currency: (amount: number): string => {
    return `ETB ${amount.toLocaleString()}`;
  },

  date: (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  dateTime: (date: string | Date): string => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  policyNumber: (number: string): string => {
    return number;
  },

  claimNumber: (number: string): string => {
    return number;
  },

  ticketNumber: (number: string): string => {
    return number;
  },

  phone: (phone: string): string => {
    if (!phone) return 'N/A';
    return phone;
  },

  status: (status: string): { label: string; color: string } => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
      APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
      SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
      UNDER_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-800' },
      PAID: { label: 'Paid', color: 'bg-green-100 text-green-800' },
      open: { label: 'Open', color: 'bg-red-100 text-red-800' },
      in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
      closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  },
};