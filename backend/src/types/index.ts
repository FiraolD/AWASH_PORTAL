export const ROLES = [
  "MASTER_ADMIN",
  "UNDERWRITING_ADMIN",
  "CLAIMS_ADMIN",
  "CUSTOMER_ADMIN",
  "CUSTOMER",
] as const;

export type UserRole = (typeof ROLES)[number];

export type UserStatus = "ACTIVE" | "INACTIVE";
export type PolicyStatus = "PENDING" | "ACTIVE" | "REJECTED" | "CANCELLED";
export type ClaimStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PAID" | "REJECTED";
export type PaymentStatus = "SUCCESS" | "PENDING" | "FAILED";
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  passwordHash: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface PolicyRecord {
  id: string;
  policyNumber: string;
  userId: string;
  type: string;
  status: PolicyStatus;
  coverageAmount: number;
  premium: number;
  premiumFrequency: "monthly" | "quarterly" | "annually";
  effectiveDate: string;
  expirationDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimTimelineRecord {
  date: string;
  status: string;
  note: string;
}

export interface ClaimRecord {
  id: string;
  claimNumber: string;
  policyId: string;
  userId: string;
  status: ClaimStatus;
  incidentDate: string;
  incidentDescription: string;
  location: string;
  estimatedAmount: number;
  submittedDate: string;
  notes?: string;
  timeline: ClaimTimelineRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodRecord {
  id: string;
  userId: string;
  type: "card" | "bank";
  last4: string;
  expiry?: string;
  brand?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  policyId?: string;
  amount: number;
  status: PaymentStatus;
  methodId?: string;
  reference: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportResponseRecord {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: SupportStatus;
  priority: "LOW" | "MEDIUM" | "HIGH";
  responses: SupportResponseRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  userId?: string;
  type: "AUTH" | "USER" | "POLICY" | "CLAIM" | "PAYMENT" | "SUPPORT" | "SYSTEM";
  message: string;
  createdAt: string;
}

export interface DatabaseRecord {
  users: UserRecord[];
  policies: PolicyRecord[];
  claims: ClaimRecord[];
  paymentMethods: PaymentMethodRecord[];
  payments: PaymentRecord[];
  supportTickets: SupportTicketRecord[];
  activities: ActivityRecord[];
  meta: {
    createdAt: string;
    updatedAt: string;
  };
}

export type PublicUser = Omit<UserRecord, "passwordHash" | "resetToken" | "resetTokenExpiresAt">;

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
