import * as React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import { UserRole } from './types';
import MainLayout from './components/layout/MainLayout';
import { RoleGuard } from './components/layout/RoleGuard';
import DashboardRouter from './pages/Dashboard/DashboardRouter';
import BuyNewPolicyPage from './pages/Customer/BuyNewPolicyPage';
import ClaimsPage from './pages/Customer/ClaimsPage';
import NewClaimPage from './pages/claims/NewClaimPage';
import FinalApprovalQueue from './pages/Underwriting/FinalApprovalQueue';



// ============================================
// AUTH PAGES
// ============================================
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/Auth/ResetPasswordPage'));

// ============================================
// ADMIN PAGES
// ============================================
const MasterAdminDashboard = React.lazy(() => import('./pages/Dashboard/MasterAdminDashboard'));
const UserManagementPage = React.lazy(() => import('./pages/Admin/UserManagementPage'));
const RoleAssignmentPage = React.lazy(() => import('./pages/Admin/RoleAssignmentPage'));
const SystemSettingsPage = React.lazy(() => import('./pages/Admin/SystemSettingsPage'));
const ClaimsAssignmentConfigPage = React.lazy(() => import('./pages/Admin/ClaimsAssignmentConfigPage'));
const RatesManagementPage = React.lazy(() => import('./pages/Admin/PremiumRateConfigPage'));
const ProductManagementPage = React.lazy(() => import('./pages/Admin/ProductManagementPage'));
const WorkflowConfigPage = React.lazy(() => import('./pages/Admin/WorkflowConfigPage'));
const AuditLogsPage = React.lazy(() => import('./pages/Admin/AuditLogsPage'));
const ApprovalRulesConfigPage = React.lazy(() => import('./pages/Admin/ApprovalRulesConfigPage'));

// ============================================
// CUSTOMER ADMIN PAGES
// ============================================
const SupportTicketsPage = React.lazy(() => import('./pages/Admin/SupportTicketsPage'));
const CustomerManagementPage = React.lazy(() => import('./pages/Admin/CustomerManagementPage'));

// ============================================
// UNDERWRITING PAGES
// ============================================
const UnifiedUnderwritingDashboard = React.lazy(() => import('./pages/Underwriting/UnifiedUnderwritingDashboard'));


// ============================================
// CLAIMS PAGES
// ============================================
const ClaimQueuePage = React.lazy(() => import('./pages/Claims/ClaimQueuePage'));
const ActiveClaimsPage = React.lazy(() => import('./pages/Claims/ActiveClaimsPage'));
const ClaimOfficerReview = React.lazy(() => import('./pages/Claims/ClaimOfficerReview'));
const UnifiedClaimsDashboard = React.lazy(() => import('./pages/Claims/UnifiedClaimsDashboard'));

// ============================================
// CUSTOMER PAGES
// ============================================
const CustomerPoliciesPage = React.lazy(() => import('./pages/Policies/PoliciesPage'));
const CustomerClaimsPage = React.lazy(() => import('./pages/Customer/ClaimsPage'));
const CustomerNewClaimPage = React.lazy(() => import('./pages/Claims/NewClaimPage'));
const CustomerPaymentsPage = React.lazy(() => import('./pages/Payments/PaymentsPage'));
const CustomerProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage'));
const CustomerDocumentsPage = React.lazy(() => import('./pages/Customer/DocumentsPage'));
const CustomerSupportPage = React.lazy(() => import('./pages/Customer/SupportPage'));
const CustomerPolicyDecisions = React.lazy(() => import('./pages/Underwriting/CustomerPolicyDecisions'));
const ClaimDetailsPage = React.lazy(() => import('./pages/Customer/ClaimDetailsPage'));
const PolicyDetailsPage = React.lazy(() => import('./pages/Policies/PolicyDetailsPage'));
const CustomerDashboardPage = React.lazy(() => import('./pages/Dashboard/CustomerDashboard'));

// ============================================
// SHARED PAGES
// ============================================
const ProfilePage = React.lazy(() => import('./pages/Profile/ProfilePage'));
const PoliciesPage = React.lazy(() => import('./pages/Policies/PoliciesPage'));
const PaymentsPage = React.lazy(() => import('./pages/Payments/PaymentsPage'));
const SupportPage = React.lazy(() => import('./pages/support/SupportPage'));

// ============================================
// HELPERS
// ============================================
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

// ============================================
// MAIN APP
// ============================================
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

        {/* Main Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardRouter />} />

          {/* ==================== UNDERWRITING ==================== */}
          <Route path="underwriting">
            <Route
              path="queue"
              element={
                <RoleGuard
                  allowedRoles={[
                    UserRole.UNDERWRITING_ADMIN,
                    UserRole.MANAGER_UNDERWRITING,
                    UserRole.HEAD_UNDERWRITING,
                    UserRole.UNDERWRITING_OFFICER,
                    UserRole.UNDERWRITING_OFFICER_I,
                    UserRole.UNDERWRITING_OFFICER_II,
                    UserRole.SENIOR_UNDERWRITING_OFFICER,
                  ]}
                >
                  <UnifiedUnderwritingDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="risk-assessment"
              element={
                <RoleGuard
                  allowedRoles={[
                    UserRole.UNDERWRITING_ADMIN,
                    UserRole.MANAGER_UNDERWRITING,
                    UserRole.HEAD_UNDERWRITING,
                    UserRole.UNDERWRITING_OFFICER,
                    UserRole.UNDERWRITING_OFFICER_II,
                    UserRole.SENIOR_UNDERWRITING_OFFICER,
                  ]}
                >
                  <UnifiedUnderwritingDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="endorsements"
              element={
                <RoleGuard
                  allowedRoles={[
                    UserRole.UNDERWRITING_ADMIN,
                    UserRole.MANAGER_UNDERWRITING,
                    UserRole.HEAD_UNDERWRITING,
                    UserRole.SENIOR_UNDERWRITING_OFFICER,
                  ]}
                >
                  <UnifiedUnderwritingDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="review-queue"
              element={
                <RoleGuard
                  allowedRoles={[
                    UserRole.UNDERWRITING_ADMIN,
                    UserRole.MANAGER_UNDERWRITING,
                    UserRole.HEAD_UNDERWRITING,
                    UserRole.UNDERWRITING_OFFICER,
                    UserRole.UNDERWRITING_OFFICER_I,
                    UserRole.UNDERWRITING_OFFICER_II,
                    UserRole.SENIOR_UNDERWRITING_OFFICER,
                  ]}
                >
                  <UnifiedUnderwritingDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="final-approval"
              element={
                <RoleGuard
                  allowedRoles={[
                    UserRole.UNDERWRITING_ADMIN,
                    UserRole.MANAGER_UNDERWRITING,
                    UserRole.HEAD_UNDERWRITING,
                    UserRole.SENIOR_UNDERWRITING_OFFICER,
                  ]}
                >
                  <FinalApprovalQueue />
                </RoleGuard>
              }
            />
          </Route>

          {/* ==================== MASTER ADMIN ==================== */}
          <Route path="admin">
            <Route
              path="users"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="roles"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <RoleAssignmentPage />
                </RoleGuard>
              }
            />
            <Route
              path="settings"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <SystemSettingsPage />
                </RoleGuard>
              }
            />
            <Route
              path="products"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <ProductManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="workflow"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <WorkflowConfigPage />
                </RoleGuard>
              }
            />
            <Route
              path="approval-rules"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <ApprovalRulesConfigPage />
                </RoleGuard>
              }
            />
            <Route
              path="audit-logs"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <AuditLogsPage />
                </RoleGuard>
              }
            />
            <Route
              path="rates"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                  <RatesManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="claims-assignment"
              element={
                <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN, UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS]}>
                  <ClaimsAssignmentConfigPage />
                </RoleGuard>
              }
            />
          </Route>

          <Route 
            path="master-admin-dashboard"
            element={
              <RoleGuard allowedRoles={[UserRole.MASTER_ADMIN]}>
                <MasterAdminDashboard />
              </RoleGuard>
            }
          />  
      

          {/* ==================== CUSTOMER ADMIN ==================== */}
          <Route path="support">
            <Route
              path="tickets"
              element={
                <RoleGuard allowedRoles={[UserRole.CUSTOMER_ADMIN, UserRole.MASTER_ADMIN]}>
                  <SupportTicketsPage />
                </RoleGuard>
              }
            />
            <Route
              path="customers"
              element={
                <RoleGuard allowedRoles={[UserRole.CUSTOMER_ADMIN, UserRole.MASTER_ADMIN]}>
                  <CustomerManagementPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* ==================== CLAIMS ROUTES ==================== */}
          {/* Specific routes FIRST */}
          <Route
            path="claims/queue"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.CLAIMS_ADMIN,
                  UserRole.MANAGER_CLAIMS,
                  UserRole.HEAD_CLAIMS,
                  UserRole.CLAIM_OFFICER,
                  UserRole.CLAIM_OFFICER_I,
                  UserRole.CLAIM_OFFICER_II,
                  UserRole.SENIOR_CLAIM_OFFICER,
                  UserRole.SUPERVISOR_CLAIMS,
                ]}
              >
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />

          <Route
            path="claims/active"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.CLAIMS_ADMIN,
                  UserRole.MANAGER_CLAIMS,
                  UserRole.HEAD_CLAIMS,
                  UserRole.CLAIM_OFFICER,
                  UserRole.CLAIM_OFFICER_I,
                  UserRole.CLAIM_OFFICER_II,
                  UserRole.SENIOR_CLAIM_OFFICER,
                  UserRole.SUPERVISOR_CLAIMS,
                ]}
              >
                <ActiveClaimsPage />
              </RoleGuard>
            }
          />

          <Route
            path="claims/new"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.MASTER_ADMIN,
                  UserRole.CLAIMS_ADMIN,
                  UserRole.CLAIM_OFFICER,
                  UserRole.CLAIM_OFFICER_I,
                  UserRole.CLAIM_OFFICER_II,
                ]}
              >
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />

          <Route
            path="claims"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.MASTER_ADMIN,
                  UserRole.CLAIMS_ADMIN,
                  UserRole.MANAGER_CLAIMS,
                  UserRole.HEAD_CLAIMS,
                  UserRole.CLAIM_OFFICER,
                  UserRole.CLAIM_OFFICER_I,
                  UserRole.CLAIM_OFFICER_II,
                  UserRole.SENIOR_CLAIM_OFFICER,
                  UserRole.SUPERVISOR_CLAIMS,
                ]}
              >
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />

          {/* Dynamic claim details – MUST BE LAST */}
          <Route
            path="claims/:id"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.MASTER_ADMIN,
                  UserRole.CLAIMS_ADMIN,
                  UserRole.MANAGER_CLAIMS,
                  UserRole.HEAD_CLAIMS,
                  UserRole.CLAIM_OFFICER,
                  UserRole.CLAIM_OFFICER_I,
                  UserRole.CLAIM_OFFICER_II,
                  UserRole.SENIOR_CLAIM_OFFICER,
                  UserRole.SUPERVISOR_CLAIMS,
                  UserRole.CUSTOMER,
                ]}
              >
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />

          {/* ==================== SPECIALISED CLAIMS DASHBOARDS ==================== */}
          <Route
            path="claims-manager-dashboard"
            element={
              <RoleGuard allowedRoles={[UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS]}>
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="claims-admin-dashboard"
            element={
              <RoleGuard allowedRoles={[UserRole.CLAIMS_ADMIN]}>
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />
          <Route 
            path="claim-officer-review/:id"
            element={
              <RoleGuard allowedRoles={[UserRole.CLAIM_OFFICER, UserRole.CLAIM_OFFICER_I, UserRole.CLAIM_OFFICER_II, UserRole.SENIOR_CLAIM_OFFICER]}>
                <UnifiedClaimsDashboard/>
              </RoleGuard>
            }
          />
          <Route
            path="Unified-Claims-Dashboard"
            element={
              <RoleGuard allowedRoles={[UserRole.CLAIMS_ADMIN, UserRole.MANAGER_CLAIMS, UserRole.HEAD_CLAIMS]}>
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="claims-officer-dashboard"
            element={
              <RoleGuard allowedRoles={[UserRole.CLAIM_OFFICER_I, UserRole.CLAIM_OFFICER_II, UserRole.SENIOR_CLAIM_OFFICER]}>
                <UnifiedClaimsDashboard />
              </RoleGuard>
            }
          />

         {/* ==================== CUSTOMER ROUTES ==================== */}
<Route path="customer">
  {/* Dashboard */}
  <Route path="dashboard" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <CustomerDashboardPage />
    </RoleGuard>
  } />
  
  {/* Policies */}
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
  <Route path="policies/:id" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <PolicyDetailsPage />
    </RoleGuard>
  } />
  
  {/* Claims */}
  <Route path="claims" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <ClaimsPage />
    </RoleGuard>
  } />
  <Route path="claims/new" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <NewClaimPage />
    </RoleGuard>
  } />
  <Route path="claims/:id" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <ClaimDetailsPage />
    </RoleGuard>
  } />
  
  {/* Payments */}
  <Route path="payments" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <CustomerPaymentsPage />
    </RoleGuard>
  } />
  
  {/* Profile */}
  <Route path="profile" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <CustomerProfilePage />
    </RoleGuard>
  } />
  
  {/* Documents */}
  <Route path="documents" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <CustomerDocumentsPage />
    </RoleGuard>
  } />
  
  {/* Support */}
  <Route path="support" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <CustomerSupportPage />
    </RoleGuard>
  } />
  
  {/* Policy Offers / Decisions (from underwriting) */}
  <Route path="policy-offers" element={
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]}>
      <CustomerPolicyDecisions />
    </RoleGuard>
  } />
</Route>

          {/* ==================== SHARED ROUTES (staff) ==================== */}
          <Route
            path="policies"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.MASTER_ADMIN,
                  UserRole.UNDERWRITING_ADMIN,
                  UserRole.CLAIMS_ADMIN,
                  UserRole.CUSTOMER_ADMIN,
                ]}
              >
                <PoliciesPage />
              </RoleGuard>
            }
          />
          <Route
            path="payments"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.MASTER_ADMIN,
                  UserRole.CUSTOMER_ADMIN,
                  UserRole.CUSTOMER,
                ]}
              >
                <PaymentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="support"
            element={
              <RoleGuard
                allowedRoles={[
                  UserRole.MASTER_ADMIN,
                  UserRole.CUSTOMER_ADMIN,
                  UserRole.CLAIMS_ADMIN,
                  UserRole.CUSTOMER,
                ]}
              >
                <SupportPage />
              </RoleGuard>
            }
          />

          {/* Profile – accessible to all authenticated users */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Catch‑all inside main layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch‑all outside main layout */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
}