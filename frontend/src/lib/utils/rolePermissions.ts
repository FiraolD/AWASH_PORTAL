export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  CEO = 'CEO',
  COO = 'COO',
  CFO = 'CFO',
  UNDERWRITING_ADMIN = 'UNDERWRITING_ADMIN',
  UNDERWRITING_OFFICER = 'UNDERWRITING_OFFICER',
  UNDERWRITING_OFFICER_I = 'UNDERWRITING_OFFICER_I',
  UNDERWRITING_OFFICER_II = 'UNDERWRITING_OFFICER_II',
  SENIOR_UNDERWRITING_OFFICER = 'SENIOR_UNDERWRITING_OFFICER',
  SUPERVISOR_UNDERWRITING = 'SUPERVISOR_UNDERWRITING',
  MANAGER_UNDERWRITING = 'MANAGER_UNDERWRITING',
  HEAD_UNDERWRITING = 'HEAD_UNDERWRITING',
  CLAIMS_ADMIN = 'CLAIMS_ADMIN',
  CLAIM_OFFICER = 'CLAIM_OFFICER',
  CLAIM_OFFICER_I = 'CLAIM_OFFICER_I',
  CLAIM_OFFICER_II = 'CLAIM_OFFICER_II',
  SENIOR_CLAIM_OFFICER = 'SENIOR_CLAIM_OFFICER',
  SUPERVISOR_CLAIMS = 'SUPERVISOR_CLAIMS',
  MANAGER_CLAIMS = 'MANAGER_CLAIMS',
  HEAD_CLAIMS = 'HEAD_CLAIMS',
  CUSTOMER_ADMIN = 'CUSTOMER_ADMIN',
  CUSTOMER_RELATION_OFFICER = 'CUSTOMER_RELATION_OFFICER',
  CUSTOMER = 'CUSTOMER',
}

export const CLAIMS_OPERATION_ROLES = [
  UserRole.CLAIM_OFFICER,
  UserRole.CLAIM_OFFICER_I,
  UserRole.CLAIM_OFFICER_II,
  UserRole.SENIOR_CLAIM_OFFICER,
] as const;

export const CLAIMS_LEADERSHIP_ROLES = [
  UserRole.SUPERVISOR_CLAIMS,
  UserRole.MANAGER_CLAIMS,
  UserRole.HEAD_CLAIMS,
] as const;

export const UNDERWRITING_OPERATION_ROLES = [
  UserRole.UNDERWRITING_OFFICER,
  UserRole.UNDERWRITING_OFFICER_I,
  UserRole.UNDERWRITING_OFFICER_II,
  UserRole.SENIOR_UNDERWRITING_OFFICER,
  UserRole.SUPERVISOR_UNDERWRITING,
] as const;

export const UNDERWRITING_LEADERSHIP_ROLES = [
  UserRole.MANAGER_UNDERWRITING,
  UserRole.HEAD_UNDERWRITING,
] as const;

const MASTER_ADMIN_ROLES = [UserRole.MASTER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN];
const EXECUTIVE_ROLES = [UserRole.CEO, UserRole.COO, UserRole.CFO];
const CLAIMS_ROLES = [UserRole.CLAIMS_ADMIN, ...CLAIMS_OPERATION_ROLES, ...CLAIMS_LEADERSHIP_ROLES];
const UNDERWRITING_ROLES = [UserRole.UNDERWRITING_ADMIN, ...UNDERWRITING_OPERATION_ROLES, ...UNDERWRITING_LEADERSHIP_ROLES];
const CUSTOMER_SERVICE_ROLES = [UserRole.CUSTOMER_ADMIN, UserRole.CUSTOMER_RELATION_OFFICER];
const ALL_STAFF_ROLES = [...MASTER_ADMIN_ROLES, ...EXECUTIVE_ROLES, ...CLAIMS_ROLES, ...UNDERWRITING_ROLES, ...CUSTOMER_SERVICE_ROLES];

export function hasPermission(role: string | undefined, allowedRoles: readonly UserRole[]): boolean {
  if (!role) return false;
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(role.toUpperCase() as UserRole);
}

export const navigationConfig = {
  items: [
    { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ALL_STAFF_ROLES },

    { title: 'User Management', href: '/admin/users', icon: 'Users', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Product Management', href: '/admin/products', icon: 'Package', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Rates Management', href: '/admin/rates', icon: 'DollarSign', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Approval Rules', href: '/admin/approval-rules', icon: 'CheckSquare', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Workflow Rules', href: '/admin/workflow', icon: 'GitBranch', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Audit Logs', href: '/admin/audit-logs', icon: 'FileSearch', roles: [UserRole.MASTER_ADMIN, UserRole.CEO] },
    { title: 'System Settings', href: '/admin/settings', icon: 'Settings', roles: [UserRole.MASTER_ADMIN] },

    { title: 'Review Queue', href: '/underwriting/queue', icon: 'Shield', roles: UNDERWRITING_ROLES },
    { title: 'Risk Assessment', href: '/underwriting/risk-assessment', icon: 'Activity', roles: [UserRole.UNDERWRITING_ADMIN, UserRole.UNDERWRITING_OFFICER_II, UserRole.SENIOR_UNDERWRITING_OFFICER, UserRole.SUPERVISOR_UNDERWRITING, ...UNDERWRITING_LEADERSHIP_ROLES] },
    { title: 'Endorsements', href: '/underwriting/endorsements', icon: 'FileText', roles: [UserRole.UNDERWRITING_ADMIN, UserRole.SENIOR_UNDERWRITING_OFFICER, UserRole.SUPERVISOR_UNDERWRITING, ...UNDERWRITING_LEADERSHIP_ROLES] },
    { title: 'Final Approval', href: '/underwriting/final-approval', icon: 'CheckCircle', roles: [UserRole.UNDERWRITING_ADMIN, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING] },

    { title: 'Claims Dashboard', href: '/claims', icon: 'Shield', roles: CLAIMS_ROLES },
    { title: 'Claim Queue', href: '/claims/queue', icon: 'ClipboardList', roles: CLAIMS_ROLES },
    { title: 'Active Claims', href: '/claims/active', icon: 'Activity', roles: CLAIMS_ROLES },
    { title: 'Claims Assignment', href: '/admin/claims-assignment', icon: 'Users', roles: [UserRole.MASTER_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS] },

    { title: 'Dashboard', href: '/customer/dashboard', icon: 'LayoutDashboard', roles: [UserRole.CUSTOMER] },
    { title: 'My Policies', href: '/customer/policies', icon: 'FileText', roles: [UserRole.CUSTOMER] },
    { title: 'My Claims', href: '/customer/claims', icon: 'Shield', roles: [UserRole.CUSTOMER] },
    { title: 'My Payments', href: '/customer/payments', icon: 'CreditCard', roles: [UserRole.CUSTOMER] },
    { title: 'Customer Support', href: '/customer/support', icon: 'HelpCircle', roles: [UserRole.CUSTOMER] },

    { title: 'Support Tickets', href: '/support/tickets', icon: 'Ticket', roles: CUSTOMER_SERVICE_ROLES },
    { title: 'Customer Management', href: '/support/customers', icon: 'Users', roles: [UserRole.CUSTOMER_ADMIN] },

    { title: 'Payments Overview', href: '/payments', icon: 'CreditCard', roles: [UserRole.CEO, UserRole.CFO] },
    { title: 'Profile', href: '/profile', icon: 'User', roles: [...ALL_STAFF_ROLES, UserRole.CUSTOMER] },
  ],
};

export const getSidebarNavigation = (role: string | undefined) => {
  if (!role) return [];
  return navigationConfig.items.filter((item) => hasPermission(role, item.roles));
};
