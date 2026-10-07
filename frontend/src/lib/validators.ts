import * as z from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const policySchema = z.object({
  type: z.string().min(1, 'Policy type is required'),
  coverageAmount: z.number().min(100000, 'Coverage amount must be at least ETB 100,000'),
  premium: z.number().positive('Premium is required'),
  premiumFrequency: z.string().min(1, 'Premium frequency is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  expirationDate: z.string().min(1, 'Expiration date is required'),
});

export const claimSchema = z.object({
  policyId: z.string().min(1, 'Policy is required'),
  incidentDate: z.string().min(1, 'Incident date is required'),
  incidentDescription: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(3, 'Location is required'),
  estimatedAmount: z.number().optional(),
  natureOfLoss: z.string().min(1, 'Nature of loss is required'),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});