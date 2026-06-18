import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import MasterAdminDashboard from './MasterAdminDashboard';
import CustomerDashboard from './CustomerDashboard';
import ClaimsAdminDashboard from './ClaimsAdminDashboard';
import UnderwritingAdminDashboard from './UnderwritingAdminDashboard';
import UnderwritingOfficersDashboard from './UnderwritingOfficersDashboard';
import UnderwritingManagerDashboard from './UnderwritingManagerDashboard';
import UnderwritingHeadDashboard from './UnderwritingHeadDashboard';
import ClaimsOfficerDashboard from './ClaimsOfficerDashboard';
import ClaimsManagerDashboard from './ClaimsManagerDashboard';
import ClaimsHeadDashboard from './ClaimsHeadDashboard';
import CustomerAdminDashboard from './CustomerAdminDashboard';

// Underwriting page components
import PolicyQueuePage from '../underwriting/PolicyQueuePage';
import RiskAssessmentPage from '../underwriting/RiskAssessmentPage';
import EndorsementsPage from '../underwriting/EndorsementsPage';
import UnderwriterReviewQueue from '../underwriting/UnderwriterReviewQueue';
import FinalApprovalQueue from '../underwriting/FinalApprovalQueue';

// Customer page components
import CustomerPolicyDecisions from '../Underwriting/CustomerPolicyDecisions';

type DashboardType = 
  | 'loading' 
  | 'customer' 
  | 'customer_admin'
  | 'claims_officer'
  | 'claims_manager'
  | 'claims_head'
  | 'claims_admin'
  | 'underwriting_officer'
  | 'underwriting_manager'
  | 'underwriting_head'
  | 'underwriting_admin'
  | 'master_admin';

// Helper function to get user role
const getUserRole = (role: string | undefined): DashboardType => {
  const normalizedRole = role?.toUpperCase() || '';
  
  // Customer roles
  if (normalizedRole === 'CUSTOMER') return 'customer';
  
  // Customer Admin roles
  if (['CUSTOMER_ADMIN', 'CUSTOMER_SUPPORT'].includes(normalizedRole)) return 'customer_admin';
  
  // Claims roles
  if (['CLAIMS_OFFICER', 'CLAIMS_OFFICER_I', 'CLAIMS_OFFICER_II'].includes(normalizedRole)) return 'claims_officer';
  if (['CLAIMS_MANAGER', 'MANAGER_CLAIMS'].includes(normalizedRole)) return 'claims_manager';
  if (['CLAIMS_HEAD', 'HEAD_CLAIMS'].includes(normalizedRole)) return 'claims_head';
  if (normalizedRole === 'CLAIMS_ADMIN') return 'claims_admin';
  
  // Underwriting roles
  if (['UNDERWRITING_OFFICER', 'UNDERWRITING_OFFICER_I', 'UNDERWRITING_OFFICER_II'].includes(normalizedRole)) return 'underwriting_officer';
  if (['UNDERWRITING_MANAGER', 'MANAGER_UNDERWRITING'].includes(normalizedRole)) return 'underwriting_manager';
  if (['UNDERWRITING_HEAD', 'HEAD_UNDERWRITING'].includes(normalizedRole)) return 'underwriting_head';
  if (normalizedRole === 'UNDERWRITING_ADMIN') return 'underwriting_admin';
  
  // Master Admin (highest level)
  if (['MASTER_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) return 'master_admin';
  
  // Default fallback
  return 'master_admin';
};

// Dashboard component that renders based on role and optional sub-page
interface DashboardRouterProps {
  subPage?: string;
}

const DashboardRouter = ({ subPage }: DashboardRouterProps = {}) => {
  const { user } = useAuthStore();
  const [dashboardType, setDashboardType] = useState<DashboardType>('loading');

  useEffect(() => {
    const role = getUserRole(user?.role);
    setDashboardType(role);
  }, [user?.role]);

  if (dashboardType === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Customer Dashboard with sub-pages
  if (dashboardType === 'customer') {
    // Handle customer sub-pages
    if (subPage === 'policy-offers') {
      return <CustomerPolicyDecisions />;
    }
    return <CustomerDashboard />;
  }

  // Customer Admin Dashboard
  if (dashboardType === 'customer_admin') {
    return <CustomerAdminDashboard />;
  }

  // Claims Officer Dashboard
  if (dashboardType === 'claims_officer') {
    return <ClaimsOfficerDashboard />;
  }

  // Claims Manager Dashboard
  if (dashboardType === 'claims_manager') {
    return <ClaimsManagerDashboard />;
  }

  // Claims Head Dashboard
  if (dashboardType === 'claims_head') {
    return <ClaimsHeadDashboard />;
  }

  // Claims Admin Dashboard
  if (dashboardType === 'claims_admin') {
    return <ClaimsAdminDashboard />;
  }

  // Underwriting Officer Dashboard with sub-pages
  if (dashboardType === 'underwriting_officer') {
    // Handle underwriting sub-pages
    switch (subPage) {
      case 'policy-queue':
        return <PolicyQueuePage />;
      case 'risk-assessment':
        return <RiskAssessmentPage />;
      case 'endorsements':
        return <EndorsementsPage />;
      case 'review-queue':
        return <UnderwriterReviewQueue />;
      case 'final-approval':
        return <FinalApprovalQueue />;
      default:
        return <UnderwritingOfficersDashboard />;
    }
  }

  // Underwriting Manager Dashboard with sub-pages
  if (dashboardType === 'underwriting_manager') {
    switch (subPage) {
      case 'policy-queue':
        return <PolicyQueuePage />;
      case 'risk-assessment':
        return <RiskAssessmentPage />;
      case 'endorsements':
        return <EndorsementsPage />;
      case 'review-queue':
        return <UnderwriterReviewQueue />;
      case 'final-approval':
        return <FinalApprovalQueue />;
      default:
        return <UnderwritingManagerDashboard />;
    }
  }

  // Underwriting Head Dashboard with sub-pages
  if (dashboardType === 'underwriting_head') {
    switch (subPage) {
      case 'policy-queue':
        return <PolicyQueuePage />;
      case 'risk-assessment':
        return <RiskAssessmentPage />;
      case 'endorsements':
        return <EndorsementsPage />;
      case 'review-queue':
        return <UnderwriterReviewQueue />;
      case 'final-approval':
        return <FinalApprovalQueue />;
      default:
        return <UnderwritingHeadDashboard />;
    }
  }

  // Underwriting Admin Dashboard with sub-pages
  if (dashboardType === 'underwriting_admin') {
    switch (subPage) {
      case 'policy-queue':
        return <PolicyQueuePage />;
      case 'risk-assessment':
        return <RiskAssessmentPage />;
      case 'endorsements':
        return <EndorsementsPage />;
      case 'review-queue':
        return <UnderwriterReviewQueue />;
      case 'final-approval':
        return <FinalApprovalQueue />;
      default:
        return <UnderwritingAdminDashboard />;
    }
  }

  // Master Admin Dashboard
  if (dashboardType === 'master_admin') {
    // Master admin can also access underwriting pages
    switch (subPage) {
      case 'policy-queue':
        return <PolicyQueuePage />;
      case 'risk-assessment':
        return <RiskAssessmentPage />;
      case 'endorsements':
        return <EndorsementsPage />;
      case 'review-queue':
        return <UnderwriterReviewQueue />;
      case 'final-approval':
        return <FinalApprovalQueue />;
      case 'policy-offers':
        return <CustomerPolicyDecisions />;
      default:
        return <MasterAdminDashboard />;
    }
  }

  return <MasterAdminDashboard />;
};

export default DashboardRouter;