import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import MasterAdminDashboard from './MasterAdminDashboard';
import CustomerDashboard from './CustomerDashboard';
import CustomerAdminDashboard from './CustomerAdminDashboard';
import UnderwritingAdminDashboard from './UnderwritingAdminDashboard';
import UnderwritingOfficersDashboard from './UnderwritingOfficersDashboard';
import UnderwritingManagerDashboard from './UnderwritingManagerDashboard';
import UnderwritingHeadDashboard from './UnderwritingHeadDashboard';
import UnifiedClaimsDashboard from '../Claims/UnifiedClaimsDashboard';
import CustomerPolicyDecisions from '../Underwriting/CustomerPolicyDecisions';

type DashboardType =
  | 'loading'
  | 'customer'
  | 'customer_admin'
  | 'claims_officer'
  | 'claims_supervisor'
  | 'claims_manager'
  | 'claims_head'
  | 'claims_admin'
  | 'underwriting_officer'
  | 'underwriting_manager'
  | 'underwriting_head'
  | 'underwriting_admin'
  | 'master_admin'
  | 'executive'
  | 'unsupported';

const CLAIM_OFFICER_ROLES = new Set(['CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II', 'SENIOR_CLAIM_OFFICER']);
const CLAIM_SUPERVISOR_ROLES = new Set(['SUPERVISOR_CLAIMS']);
const CLAIM_MANAGER_ROLES = new Set(['MANAGER_CLAIMS']);
const CLAIM_HEAD_ROLES = new Set(['HEAD_CLAIMS']);
const CLAIM_ADMIN_ROLES = new Set(['CLAIMS_ADMIN']);

const UNDERWRITING_OFFICER_ROLES = new Set([
  'UNDERWRITING_OFFICER',
  'UNDERWRITING_OFFICER_I',
  'UNDERWRITING_OFFICER_II',
  'SENIOR_UNDERWRITING_OFFICER',
  'SUPERVISOR_UNDERWRITING',
]);
const UNDERWRITING_MANAGER_ROLES = new Set(['MANAGER_UNDERWRITING']);
const UNDERWRITING_HEAD_ROLES = new Set(['HEAD_UNDERWRITING']);
const UNDERWRITING_ADMIN_ROLES = new Set(['UNDERWRITING_ADMIN']);
const EXECUTIVE_ROLES = new Set(['CEO', 'COO', 'CFO']);
const CUSTOMER_ADMIN_ROLES = new Set(['CUSTOMER_ADMIN', 'CUSTOMER_SUPPORT', 'CUSTOMER_RELATION_OFFICER']);

const resolveDashboardType = (role: string | undefined): DashboardType => {
  const normalizedRole = (role || '').toUpperCase().trim();

  if (!normalizedRole) return 'unsupported';
  if (normalizedRole === 'MASTER_ADMIN' || normalizedRole === 'SYSTEM_ADMIN' || normalizedRole === 'SUPER_ADMIN') return 'master_admin';
  if (EXECUTIVE_ROLES.has(normalizedRole)) return 'executive';

  if (CLAIM_ADMIN_ROLES.has(normalizedRole)) return 'claims_admin';
  if (CLAIM_HEAD_ROLES.has(normalizedRole)) return 'claims_head';
  if (CLAIM_MANAGER_ROLES.has(normalizedRole)) return 'claims_manager';
  if (CLAIM_SUPERVISOR_ROLES.has(normalizedRole)) return 'claims_supervisor';
  if (CLAIM_OFFICER_ROLES.has(normalizedRole)) return 'claims_officer';

  if (UNDERWRITING_ADMIN_ROLES.has(normalizedRole)) return 'underwriting_admin';
  if (UNDERWRITING_HEAD_ROLES.has(normalizedRole)) return 'underwriting_head';
  if (UNDERWRITING_MANAGER_ROLES.has(normalizedRole)) return 'underwriting_manager';
  if (UNDERWRITING_OFFICER_ROLES.has(normalizedRole)) return 'underwriting_officer';

  if (CUSTOMER_ADMIN_ROLES.has(normalizedRole)) return 'customer_admin';
  if (normalizedRole === 'CUSTOMER') return 'customer';

  return 'unsupported';
};

interface DashboardRouterProps {
  subPage?: string;
}

const UnsupportedDashboard = ({ role }: { role?: string }) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="h-12 w-12 text-amber-500" />
      <div>
        <h2 className="text-lg font-semibold text-gray-900">No dashboard is configured for this role</h2>
        <p className="text-sm text-gray-500">Role: {role || 'Unknown'}</p>
      </div>
      <Button variant="outline" onClick={() => window.location.assign('/profile')}>Go to profile</Button>
    </CardContent>
  </Card>
);

const DashboardRouter = ({ subPage }: DashboardRouterProps = {}) => {
  const { user, isLoading } = useAuthStore();
  const [dashboardType, setDashboardType] = useState<DashboardType>('loading');
  const userRole = user?.role;

  useEffect(() => {
    if (!isLoading) {
      setDashboardType(resolveDashboardType(userRole));
    }
  }, [userRole, isLoading]);

  const dashboard = useMemo(() => {
    switch (dashboardType) {
      case 'master_admin':
        return <MasterAdminDashboard />;
      case 'executive':
        return <MasterAdminDashboard />;
      case 'claims_admin':
      case 'claims_head':
      case 'claims_manager':
      case 'claims_supervisor':
      case 'claims_officer':
        return <UnifiedClaimsDashboard />;
      case 'underwriting_admin':
        return <UnderwritingAdminDashboard />;
      case 'underwriting_head':
        return <UnderwritingHeadDashboard />;
      case 'underwriting_manager':
        return <UnderwritingManagerDashboard />;
      case 'underwriting_officer':
        return <UnderwritingOfficersDashboard />;
      case 'customer_admin':
        return <CustomerAdminDashboard />;
      case 'customer':
        return subPage === 'policy-offers' ? <CustomerPolicyDecisions /> : <CustomerDashboard />;
      case 'unsupported':
        return <UnsupportedDashboard role={userRole} />;
      case 'loading':
      default:
        return null;
    }
  }, [dashboardType, subPage, userRole]);

  if (isLoading || dashboardType === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return dashboard;
};

export default DashboardRouter;
