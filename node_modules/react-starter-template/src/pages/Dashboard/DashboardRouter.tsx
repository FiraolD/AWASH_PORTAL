import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

// Dashboards
import MasterAdminDashboard from './MasterAdminDashboard';
import CustomerDashboard from './CustomerDashboard';
import CustomerAdminDashboard from './CustomerAdminDashboard';
import UnifiedUnderwritingDashboard from '../Underwriting/UnifiedUnderwritingDashboard';
import CustomerPolicyDecisions from '../Underwriting/CustomerPolicyDecisions';
import UnifiedClaimsDashboard from '../Claims/UnifiedClaimsDashboard';
import ClaimQueuePage from '../Claims/ClaimQueuePage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DashboardType =
  | 'loading'
  | 'customer'
  | 'customer_admin'
  | 'claims'
  | 'underwriting'
  | 'master_admin';

// ---------------------------------------------------------------------------
// Role → Dashboard mapping
// ---------------------------------------------------------------------------
const CLAIMS_ROLES = [
  'CLAIM_OFFICER',
  'CLAIM_OFFICER_I',
  'CLAIM_OFFICER_II',
  'SENIOR_CLAIM_OFFICER',
  'SUPERVISOR_CLAIMS',
  'MANAGER_CLAIMS',
  'HEAD_CLAIMS',
  'CLAIMS_ADMIN',
];

const MASTER_ADMIN_ROLES = [
  'MASTER_ADMIN',
  'SYSTEM_ADMIN',
  'SUPER_ADMIN',
  'CEO',
  'COO',
  'CFO',
  'ADMIN',
];

const CUSTOMER_ADMIN_ROLES = [
  'CUSTOMER_ADMIN',
  'CUSTOMER_SUPPORT',
  'CUSTOMER_RELATION_OFFICER',
];

const getUserRole = (role: string | undefined): DashboardType => {
  const normalizedRole = (role || '').toUpperCase().trim();

  console.log('[DashboardRouter] Raw role:', role);
  console.log('[DashboardRouter] Normalized role:', normalizedRole);

  // 1. Master admin / executives
  if (MASTER_ADMIN_ROLES.includes(normalizedRole)) {
    return 'master_admin';
  }

  // 2. Claims roles
  if (CLAIMS_ROLES.includes(normalizedRole)) {
    return 'claims';
  }

  // 3. Underwriting roles
  if (normalizedRole.includes('UNDERWRITING') || normalizedRole.includes('UNDERWRITER')) {
    return 'underwriting';
  }

  // 4. Customer admin / support
  if (CUSTOMER_ADMIN_ROLES.includes(normalizedRole)) {
    return 'customer_admin';
  }

  // 5. Customer
  if (normalizedRole === 'CUSTOMER') {
    return 'customer';
  }

  // 6. Fallback for unknown roles – log a warning and show customer dashboard
  console.warn(
    `[DashboardRouter] Unknown role "${normalizedRole}" – falling back to customer dashboard.`
  );
  return 'customer';
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DashboardRouterProps {
  subPage?: string; // e.g. 'queue', 'policy-offers'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const DashboardRouter = ({ subPage }: DashboardRouterProps = {}) => {
  const { user, isLoading } = useAuthStore();
  const [dashboardType, setDashboardType] = useState<DashboardType>('loading');

  useEffect(() => {
    if (!isLoading && user) {
      const role = getUserRole(user.role);
      console.log('[DashboardRouter] Resolved dashboard type:', role);
      setDashboardType(role);
    }
  }, [user, isLoading]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (isLoading || dashboardType === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Master Admin
  // -----------------------------------------------------------------------
  if (dashboardType === 'master_admin') {
    return <MasterAdminDashboard />;
  }

  // -----------------------------------------------------------------------
  // Claims
  // -----------------------------------------------------------------------
  if (dashboardType === 'claims') {
    if (subPage === 'queue') {
      return <ClaimQueuePage />;
    }
    return <UnifiedClaimsDashboard />;
  }

  // -----------------------------------------------------------------------
  // Underwriting
  // -----------------------------------------------------------------------
  if (dashboardType === 'underwriting') {
    return <UnifiedUnderwritingDashboard />;
  }

  // -----------------------------------------------------------------------
  // Customer Admin / Support
  // -----------------------------------------------------------------------
  if (dashboardType === 'customer_admin') {
    return <CustomerAdminDashboard />;
  }

  // -----------------------------------------------------------------------
  // Customer
  // -----------------------------------------------------------------------
  if (dashboardType === 'customer') {
    if (subPage === 'policy-offers') {
      return <CustomerPolicyDecisions />;
    }
    return <CustomerDashboard />;
  }

  // -----------------------------------------------------------------------
  // Ultimate fallback (should never reach here, but just in case)
  // -----------------------------------------------------------------------
  console.error('[DashboardRouter] Unhandled dashboard type:', dashboardType);
  return <CustomerDashboard />;
};

export default DashboardRouter;