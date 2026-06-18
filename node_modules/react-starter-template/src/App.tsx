import * as React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import { UserRole } from './types';
import MainLayout from './components/layout/MainLayout';
import { RoleGuard } from '../src/components/layout/RoleGuard';
import DashboardRouter from './pages/Dashboard/DashboardRouter';
import BuyNewPolicyPage from './pages/Customer/BuyNewPolicyPage';

// Auth Pages
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/Auth/ResetPasswordPage'));

// Admin Pages
const UserManagementPage = React.lazy(() => import('./pages/Admin/UserManagementPage'));
const RoleAssignmentPage = React.lazy(() => import('./pages/Admin/RoleAssignmentPage'));
const SystemSettingsPage = React.lazy(() => import('./pages/Admin/SystemSettingsPage'));
const ClaimsAssignmentConfigPage = React.lazy(() => import('./pages/Admin/ClaimsAssignmentConfigPage'));
const RatesManagementPage = React.lazy(() => import('./pages/Admin/PremiumRateConfigPage'));
const ProductManagementPage = React.lazy(() => import('./pages/Admin/ProductManagementPage'));
const WorkflowConfigPage = React.lazy(() => import('./pages/Admin/WorkflowConfigPage'));
const AuditLogsPage = React.lazy(() => import('./pages/Admin/AuditLogsPage'));
const ApprovalRulesConfigPage = React.lazy(() => import('./pages/Admin/ApprovalRulesConfigPage'));

// Customer Admin Pages
const SupportTicketsPage = React.lazy(() => import('./pages/Admin/SupportTicketsPage'));
const CustomerManagementPage = React.lazy(() => import('./pages/Admin/CustomerManagementPage'));

// Underwriting Pages
const PolicyQueuePage = React.lazy(() => import('./pages/Underwriting/PolicyQueuePage'));
const RiskAssessmentPage = React.lazy(() => import('./pages/Underwriting/RiskAssessmentPage'));
const EndorsementsPage = React.lazy(() => import('./pages/Underwriting/EndorsementsPage'));
const UnderwriterReviewQueue = React.lazy(() => import('./pages/Underwriting/UnderwriterReviewQueue'));
const FinalApprovalQueue = React.lazy(() => import('./pages/Underwriting/FinalApprovalQueue'));

// Claims Pages
const ClaimQueuePage = React.lazy(() => import('./pages/Claims/ClaimQueuePage'));
const ActiveClaimsPage = React.lazy(() => import('./pages/Claims/ActiveClaimsPage'));

// Customer Pages
const CustomerPoliciesPage = React.lazy(() => import('./pages/Policies/PoliciesPage'));
const CustomerClaimsPage = React.lazy(() => import('./pages/Customer/ClaimsPage'));
const CustomerNewClaimPage = React.lazy(() => import('./pages/Claims/NewClaimPage'));
const CustomerPaymentsPage = React.lazy(() => import('./pages/Payments/PaymentsPage'));
const CustomerProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage'));
const CustomerDocumentsPage = React.lazy(() => import('./pages/Customer/DocumentsPage'));
const CustomerSupportPage = React.lazy(() => import('./pages/Customer/SupportPage'));
const CustomerPolicyDecisions = React.lazy(() => import('./pages/Underwriting/CustomerPolicyDecisions'));
// In your App.tsx or routes configuration
const ClaimDetailsPage = React.lazy(() => import ('./pages/customer/ClaimDetailsPage'));
const PolicyDetailsPage = React.lazy(() => import ( './pages/policies/PolicyDetailsPage'));





// Shared Pages
const ProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage'));
const PoliciesPage = React.lazy(() => import('./pages/Policies/PoliciesPage'));
//const ClaimsPage = React.lazy(() => import('./pages/Claims/ClaimsPage'));
const PaymentsPage = React.lazy(() => import('./pages/Payments/PaymentsPage'));
const SupportPage = React.lazy(() => import('./pages/support/SupportPage'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
    <div className="flex flex-col items-center space-y-6">
      <div className="relative h-24 w-24">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden p-3">
          <div className="h-full w-full animate-pulse bg-gray-200 rounded" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold tracking-widest text-[#1a3668] uppercase">Awash Insurance</p>
        <p className="text-[10px] font-medium text-[#E31E24] tracking-widest uppercase mt-1">Loading...</p>
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Main Application Routes - All protected routes go inside here */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardRouter />} />

          {/* ==================== UNDERWRITING ROUTES ==================== */}
          <Route path="underwriting">
            <Route path="queue" element={
              <RoleGuard allowedRoles={[UserRole.UNDERWRITING_ADMIN, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING, UserRole.UNDERWRITING_OFFICER, UserRole.UNDERWRITING_OFFICER_I, UserRole.UNDERWRITING_OFFICER_II, UserRole.SENIOR_UNDERWRITING_OFFICER]}>
                <PolicyQueuePage />
              </RoleGuard>
            } />
            <Route path="risk-assessment" element={
              <RoleGuard allowedRoles={[UserRole.UNDERWRITING_ADMIN, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING, UserRole.UNDERWRITING_OFFICER, UserRole.UNDERWRITING_OFFICER_II, UserRole.SENIOR_UNDERWRITING_OFFICER]}>
                <RiskAssessmentPage />
              </RoleGuard>
            } />
            <Route path="endorsements" element={
              <RoleGuard allowedRoles={[UserRole.UNDERWRITING_ADMIN, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING, UserRole.SENIOR_UNDERWRITING_OFFICER]}>
                <EndorsementsPage />
              </RoleGuard>
            } />
            <Route path="review-queue" element={
              <RoleGuard allowedRoles={[UserRole.UNDERWRITING_ADMIN, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING, UserRole.UNDERWRITING_OFFICER, UserRole.UNDERWRITING_OFFICER_I, UserRole.UNDERWRITING_OFFICER_II, UserRole.SENIOR_UNDERWRITING_OFFICER]}>
                <UnderwriterReviewQueue />
              </RoleGuard>
            } />
            <Route path="final-approval" element={
              <RoleGuard allowedRoles={[UserRole.UNDERWRITING_ADMIN, UserRole.MANAGER_UNDERWRITING, UserRole.HEAD_UNDERWRITING, UserRole.SENIOR_UNDERWRITING_OFFICER]}>
                <FinalApprovalQueue />
              </RoleGuard>
            } />
          </Route>

          {/* ==================== MASTER ADMIN ROUTES ==================== */}
          <Route path="admin">
            <Route path="users" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <UserManagementPage />
              </RoleGuard>
            } />
            <Route path="roles" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <RoleAssignmentPage />
              </RoleGuard>
            } />
            <Route path="settings" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <SystemSettingsPage />
              </RoleGuard>
            } />
            <Route path="products" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <ProductManagementPage />
              </RoleGuard>
            } />
            <Route path="workflow" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <WorkflowConfigPage />
              </RoleGuard>
            } />
            <Route path="approval-rules" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <ApprovalRulesConfigPage />
              </RoleGuard>
            } />
            <Route path="audit-logs" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <AuditLogsPage />
              </RoleGuard>
            } />
            <Route path="rates" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <RatesManagementPage />
              </RoleGuard>
            } />
            <Route path="claims-assignment" element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.CLAIMS_ADMIN]}>
                <ClaimsAssignmentConfigPage />
              </RoleGuard>
            } />
          </Route>

          {/* ==================== CUSTOMER ADMIN ROUTES ==================== */}
          <Route path="support">
            <Route path="tickets" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER_ADMIN, UserRole.MASTER_ADMIN]}>
                <SupportTicketsPage />
              </RoleGuard>
            } />
            <Route path="customers" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER_ADMIN, UserRole.MASTER_ADMIN]}>
                <CustomerManagementPage />
              </RoleGuard>
            } />
          </Route>

          {/* ==================== CLAIMS ADMIN ROUTES ==================== */}
          <Route path="claims-admin">
            <Route path="queue" element={
              <RoleGuard allowedRoles={[UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS, UserRole.CLAIM_OFFICER]}>
                <ClaimQueuePage />
              </RoleGuard>
            } />
            <Route path="active" element={
              <RoleGuard allowedRoles={[UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS]}>
                <ActiveClaimsPage />
              </RoleGuard>
            } />
          </Route>

          {/* ==================== CUSTOMER ROUTES ==================== */}
          <Route path="customer">
            <Route path="policies" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerPoliciesPage />
              </RoleGuard>
            } />
            <Route path="policies/new" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <BuyNewPolicyPage />
              </RoleGuard>
            } />
      
            <Route path="claims/:id" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
              <ClaimDetailsPage />
               </RoleGuard>
              } />


            <Route path="/customer/policies/:id" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
              <PolicyDetailsPage />
              </RoleGuard>
            } />

            <Route path="claims" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerClaimsPage />
              </RoleGuard>
            } />
            <Route path="claims/new" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerNewClaimPage />
              </RoleGuard>
            } />
            <Route path="payments" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerPaymentsPage />
              </RoleGuard>
            } />
            <Route path="profile" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerProfilePage />
              </RoleGuard>
            } />
            <Route path="documents" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerDocumentsPage />
              </RoleGuard>
            } />
            <Route path="support" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerSupportPage />
              </RoleGuard>
            } />
            <Route path="policy-offers" element={
              <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
                <CustomerPolicyDecisions />
              </RoleGuard>
            } />
          </Route>

          {/* ==================== SHARED ROUTES ==================== */}
          <Route path="policies" element={
            <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.UNDERWRITING_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.CUSTOMER_ADMIN]}>
              <PoliciesPage />
            </RoleGuard>
          } />
          <Route path="claims" element={
            <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS]}>
              <CustomerClaimsPage />
            </RoleGuard>
          } />
          <Route path="claims/new" element={
            <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.CLAIM_OFFICER]}>
              <CustomerNewClaimPage />
            </RoleGuard>
          } />
          <Route path="payments" element={
            <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.CUSTOMER_ADMIN, UserRole.CUSTOMER]}>
              <PaymentsPage />
            </RoleGuard>
          } />
          <Route path="support" element={
            <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.CUSTOMER_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.CUSTOMER]}>
              <SupportPage />
            </RoleGuard>
          } />
          <Route path="profile" element={<ProfilePage />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        {/* Catch all outside main layout */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
}