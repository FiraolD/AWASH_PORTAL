export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
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

export function hasPermission(role: string | undefined, allowedRoles: UserRole[]): boolean {
  if (!role) return false;
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(role as UserRole);
}

export const navigationConfig = {
  items: [
    // ==================== SHARED ROUTES ====================
   
    // ==================== MASTER ADMIN ====================
    {title: 'Dashboard', href: '/master-admin-dashboard', icon: 'LayoutDashboard', roles: [UserRole.MASTER_ADMIN]},
    { title: 'User Management', href: '/admin/users', icon: 'Users', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Product Management', href: '/admin/products', icon: 'Package', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Rates Management', href: '/admin/rates', icon: 'DollarSign', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Approval Rules', href: '/admin/approval-rules', icon: 'CheckSquare', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Claims Assignment', href: '/admin/claims-assignment', icon: 'Users', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Audit Logs', href: '/admin/audit-logs', icon: 'FileSearch', roles: [UserRole.MASTER_ADMIN] },
    { title: 'System Settings', href: '/admin/settings', icon: 'Settings', roles: [UserRole.MASTER_ADMIN] },
    { title: 'Profile', href: '/profile', icon: 'User', roles: [UserRole.MASTER_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.UNDERWRITING_ADMIN, UserRole.CUSTOMER_ADMIN, UserRole.CEO] },

    // ==================== UNDERWRITING ====================
    { 
      title: 'Dashboard', 
      href: '/underwriting/manager/stats', 
      icon: 'FileText', 
      roles: [UserRole.SUPERVISOR_UNDERWRITING, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING] 
    },
    { 
      title: 'Pending Requests', 
      href: '/underwriting/review-queue', 
      icon: 'Shield', 
      roles: [
        UserRole.MANAGER_UNDERWRITING, 
        UserRole.UNDERWRITING_ADMIN, 
        UserRole.SENIOR_UNDERWRITING_OFFICER, 
        UserRole.UNDERWRITING_OFFICER_I,
        UserRole.UNDERWRITING_OFFICER_II,
        UserRole.SUPERVISOR_UNDERWRITING, 
        UserRole.HEAD_UNDERWRITING
      ] 
    },
    { 
      title: 'Final Approval', 
      href: '/underwriting/final-approval', 
      icon: 'CheckCircle', 
      roles: [
        UserRole.UNDERWRITING_ADMIN, 
        UserRole.MANAGER_UNDERWRITING, 
        UserRole.HEAD_UNDERWRITING, 
        UserRole.SENIOR_UNDERWRITING_OFFICER
      ] 
    },
    { 
      title: 'Strategic Overview', 
      href: '/underwriting/head/dashboard', 
      icon: 'BarChart3', 
      roles: [UserRole.HEAD_UNDERWRITING, UserRole.UNDERWRITING_ADMIN] 
    },

    // ==================== CLAIMS ROUTES (corrected hrefs) ====================
 
    { 
      title: 'Claims Dashboard', 
      href: '/claims', 
      icon: 'Shield', 
      roles: [
        UserRole.CLAIMS_ADMIN, 
        UserRole.CLAIM_OFFICER, 
        UserRole.CLAIM_OFFICER_I, 
        UserRole.CLAIM_OFFICER_II,
        UserRole.SENIOR_CLAIM_OFFICER, 
        UserRole.SUPERVISOR_CLAIMS, 
        UserRole.MANAGER_CLAIMS, 
        UserRole.HEAD_CLAIMS
      ] 
    },
    { 
      title: 'Claims Assignment', 
      href: '/admin/claims-assignment', 
      icon: 'Users', 
      roles: [UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS] 
    },

    // ==================== CUSTOMER ====================
    { title: 'Dashboard', href: '/customer/dashboard', icon: 'LayoutDashboard', roles: [UserRole.CUSTOMER] },
    { title: 'My Policies', href: '/customer/policies', icon: 'FileText', roles: [UserRole.CUSTOMER] },
    { title: 'My Claims', href: '/customer/claims', icon: 'Shield', roles: [UserRole.CUSTOMER] },
    { title: 'My Payments', href: '/customer/payments', icon: 'CreditCard', roles: [UserRole.CUSTOMER] },
    { title: 'Customer Support', href: '/customer/support', icon: 'HelpCircle', roles: [UserRole.CUSTOMER] },

    // ==================== CUSTOMER ADMIN ====================
    { title: 'Support Tickets', href: '/support/tickets', icon: 'Ticket', roles: [UserRole.CUSTOMER_ADMIN] },
    { title: 'Customer Management', href: '/support/customers', icon: 'Users', roles: [UserRole.CUSTOMER_ADMIN] },

    // ==================== CEO ====================
    { title: 'Payments Overview', href: '/payments', icon: 'CreditCard', roles: [UserRole.CEO] },
    { title: 'Audit Logs', href: '/admin/audit-logs', icon: 'FileSearch', roles: [UserRole.CEO] },
  ],
};

export const getSidebarNavigation = (role: string | undefined) => {
  if (!role) return [];
  return navigationConfig.items.filter(item => hasPermission(role, item.roles));
};