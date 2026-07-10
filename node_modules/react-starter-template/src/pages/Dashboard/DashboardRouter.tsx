import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import MasterAdminDashboard from './MasterAdminDashboard';
import CustomerDashboard from './CustomerDashboard';
import CustomerAdminDashboard from './CustomerAdminDashboard';

import ClaimsOfficerDashboard from '../Claims/ClaimsOfficerDashboard';
import ClaimsManagerDashboard from '../Claims/ClaimsManagerDashboard';
import ClaimsAdminDashboard from '../Claims/ClaimsAdminDashboard';
import UnifiedUnderwritingDashboard from '../Underwriting/UnifiedUnderwritingDashboard';

// Customer page components
import CustomerPolicyDecisions from '../Underwriting/CustomerPolicyDecisions';

type DashboardType = 
  | 'loading' 
  | 'customer' 
  | 'customer_admin'
  | 'claims_officer'
  | 'claims_manager'
  | 'claims_admin'
  | 'underwriting'
  | 'master_admin';

// Helper function to get user role
const getUserRole = (role: string | undefined): DashboardType => {
  const normalizedRole = role?.toUpperCase().trim() || '';

  console.log('[DashboardRouter] Raw role:', role);
  console.log('[DashboardRouter] Normalized role:', normalizedRole);

  // Customer
  if (normalizedRole === 'CUSTOMER') return 'customer';

  // Customer-facing support/admin roles
  if (['CUSTOMER_ADMIN', 'CUSTOMER_SUPPORT', 'CUSTOMER_RELATION_OFFICER'].includes(normalizedRole)) {
    return 'customer_admin';
  }

  // ---- CLAIMS ROLES ----
  if (normalizedRole === 'CLAIM_OFFICER' || normalizedRole === 'CLAIM_OFFICER_I' || normalizedRole === 'CLAIM_OFFICER_II' || normalizedRole === 'SENIOR_CLAIM_OFFICER' || normalizedRole === 'SUPERVISOR_CLAIMS') {
    return 'claims_officer';
  }

  if (normalizedRole === 'MANAGER_CLAIMS' || normalizedRole === 'HEAD_CLAIMS') {
    return 'claims_manager';
  }

  if (normalizedRole === 'CLAIMS_ADMIN' || normalizedRole === 'MASTER_ADMIN' || normalizedRole === 'SYSTEM_ADMIN' || normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'CEO' || normalizedRole === 'COO' || normalizedRole === 'CFO' || normalizedRole === 'ADMIN') {
    return 'claims_admin';
  }

  // ---- UNDERWRITING ROLES (broad match) ----
  if (normalizedRole.includes('UNDERWRITING') || normalizedRole.includes('UNDERWRITER')) {
    console.log('[DashboardRouter] Mapped to underwriting');
    return 'underwriting';
  }

  // ---- MASTER ADMIN / EXECUTIVE ROLES ----
  if (['MASTER_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN', 'CEO', 'COO', 'CFO', 'ADMIN'].includes(normalizedRole)) {
    return 'master_admin';
  }

  // Fallback
  console.warn('[DashboardRouter] Unknown role, defaulting to customer:', normalizedRole);
  return 'customer';
};

interface DashboardRouterProps {
  subPage?: string;
}

const DashboardRouter = ({ subPage }: DashboardRouterProps = {}) => {
  const { user, isLoading } = useAuthStore();
  const [dashboardType, setDashboardType] = useState<DashboardType>('loading');

  useEffect(() => {
    if (!isLoading && user) {
      const role = getUserRole(user?.role);
      console.log('[DashboardRouter] Final dashboard type:', role);
      setDashboardType(role);
    }
  }, [user, isLoading]);

  if (isLoading || dashboardType === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ===== CUSTOMER =====
  if (dashboardType === 'customer') {
    if (subPage === 'policy-offers') {
      return <CustomerPolicyDecisions />;
    }
    return <CustomerDashboard />;
  }

  if (dashboardType === 'customer_admin') {
    return <CustomerAdminDashboard />;
  }

  // ===== CLAIMS =====
  if (dashboardType === 'claims_officer') {
    return <ClaimsOfficerDashboard />;
  }

  if (dashboardType === 'claims_manager') {
    return <ClaimsManagerDashboard />;
  }

  if (dashboardType === 'claims_admin') {
    return <ClaimsAdminDashboard />;
  }

  // ===== UNDERWRITING =====
  if (dashboardType === 'underwriting') {
    return <UnifiedUnderwritingDashboard />;
  }

  // ===== MASTER ADMIN =====
  if (dashboardType === 'master_admin') {
    return <MasterAdminDashboard />;
  }

  // ===== FALLBACK =====
  return <CustomerDashboard />;
};

export default DashboardRouter;