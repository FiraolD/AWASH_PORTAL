import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { hasPermission } from '../../lib/utils/rolePermissions';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowedPermissions?: string[];
  fallbackPath?: string;
}

export function RoleGuard({ 
  children, 
  allowedRoles = [], 
  allowedPermissions = [], 
  fallbackPath = '/dashboard' 
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, hasPermission: storeHasPermission } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Master admin has access to everything
  if (user.role === UserRole.MASTER_ADMIN) {
    return <>{children}</>;
  }
  

  // Check role-based access
  const hasRoleAccess = allowedRoles.length === 0 || hasPermission(user.role, allowedRoles);
  
  // Check permission-based access
  const hasPermissionAccess = allowedPermissions.length === 0 || 
    allowedPermissions.some(perm => storeHasPermission(perm));

  if (!hasRoleAccess || !hasPermissionAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}