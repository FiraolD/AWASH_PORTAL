import { useAuthStore } from '../stores/authStore';
import { hasPermission, UserRole } from '../lib/utils/rolePermissions';

export function usePermissions() {
  const { user } = useAuthStore();

  const can = (requiredRoles: UserRole[]) => {
    return hasPermission(user?.role, requiredRoles);
  };

  const isMasterAdmin = () => user?.role === UserRole.MASTER_ADMIN;
  const isCustomer = () => user?.role === UserRole.CUSTOMER;
  const isClaimsAdmin = () => user?.role === UserRole.CLAIMS_ADMIN;
  const isUnderwritingAdmin = () => user?.role === UserRole.UNDERWRITING_ADMIN;

  return { can, isMasterAdmin, isCustomer, isClaimsAdmin, isUnderwritingAdmin, role: user?.role };
}