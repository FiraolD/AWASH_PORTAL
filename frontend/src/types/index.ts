export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  CEO = 'CEO',
  COO = 'COO',
  CFO = 'CFO',
  UNDERWRITING_OFFICER = 'UNDERWRITING_OFFICER',
  UNDERWRITING_OFFICER_I = 'UNDERWRITING_OFFICER_I',
  UNDERWRITING_OFFICER_II = 'UNDERWRITING_OFFICER_II',
  SENIOR_UNDERWRITING_OFFICER = 'SENIOR_UNDERWRITING_OFFICER',
  SUPERVISOR_UNDERWRITING = 'SUPERVISOR_UNDERWRITING',
  MANAGER_UNDERWRITING = 'MANAGER_UNDERWRITING',
  HEAD_UNDERWRITING = 'HEAD_UNDERWRITING',
  CLAIM_OFFICER = 'CLAIM_OFFICER',
  CLAIM_OFFICER_I = 'CLAIM_OFFICER_I',
  CLAIM_OFFICER_II = 'CLAIM_OFFICER_II',
  SENIOR_CLAIM_OFFICER = 'SENIOR_CLAIM_OFFICER',
  SUPERVISOR_CLAIMS = 'SUPERVISOR_CLAIMS',
  MANAGER_CLAIMS = 'MANAGER_CLAIMS',
  HEAD_CLAIMS = 'HEAD_CLAIMS',
  CUSTOMER_RELATION_OFFICER = 'CUSTOMER_RELATION_OFFICER',
  CUSTOMER = 'CUSTOMER',
  CUSTOMER_ADMIN = 'CUSTOMER_ADMIN',
  UNDERWRITING_ADMIN = 'UNDERWRITING_ADMIN',
  CLAIMS_ADMIN = 'CLAIMS_ADMIN'
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}
export interface ProductField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  options?: string[];
  placeholder?: string;
  display_order: number;
}
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string; // ACTIVE, INACTIVE, SUSPENDED
  phone?: string;
  dateOfBirth?: string;
  address?: Address;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PolicyType = 'auto' | 'home' | 'life' | 'health';
export type PolicyStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED'| 'APPROVED' | 'REJECTED';

export interface Policy {
  id: string;
  policyNumber: string;
  type: PolicyType;
  status: PolicyStatus;
  coverageAmount: number;
  premium: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'annually';
  effectiveDate: string;
  expirationDate: string;
  documents: { id: string; name: string; url: string; type: string }[];
  insuredItems?: string[];
}

export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID' | 'DENIED';

export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  userId?: string;      // Make optional or add
  userEmail?: string;   // Make optional or add
  status: string;
  incidentDate: string;
  incidentDescription: string;
  location: string;
  estimatedAmount: number;
  submittedDate: string;
  adjuster?: {
    name: string;
    email: string;
    phone: string;
  };
  timeline: {
    date: string;
    status: string;
    note: string;
  }[];
  documents: {
    id: string;
    name: string;
    url: string;
  }[];
}

export type PaymentStatus = 'success' | 'pending' | 'failed';
export type PaymentMethodType = 'card' | 'bank' | 'mobile_money' | 'transfer_letter';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4: string;
  expiry?: string;
  brand?: string;
  isDefault: boolean;
}

export interface Payment {
  id: string;
  policyId: string;
  amount: number;
  date: string;
  method: {
    id: string;
    type: PaymentMethodType;
    last4: string;
  };
  status: PaymentStatus;
  receiptUrl?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  percentage: number;
}
export interface PremiumCalculation {
  basicPremium: number;
  vatAmount: number;
  drrAmount: number;
  totalPremium: number;
  monthlyPremium: number;
  riskModifier: number;
  coverageTier: string;
  baseRate: number;
  breakdown: { factor: string; amount: number; percentage: number }[];
}