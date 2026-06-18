import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// For combining Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
export function rolepermissions(role: string): string[] {
  const permissionsMap: Record<string, string[]> = {
    'CUSTOMER': ['view_claims', 'submit_claims', 'view_policies'],  
    'CUSTOMER_ADMIN': ['manage_customers', 'view_tickets', 'manage_tickets'],
    'UNDERWRITING_ADMIN': ['view_queue', 'manage_queue', 'view_risk', 'manage_risk', 'view_endorsements', 'manage_endorsements'],
    'CLAIMS_ADMIN': ['view_claims_queue', 'manage_claims_queue', 'view_active_claims', 'manage_active_claims'],
    // Add more roles and permissions as needed
  }};
// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}