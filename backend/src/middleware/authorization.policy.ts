export interface AuthorizationUser {
  id: string;
  role: string;
}

/**
 * Pure authorization policy helpers.
 * Keep these functions free of HTTP/database side effects so they can be regression-tested
 * without connecting to production infrastructure.
 */
export function isAuthenticatedUser(user?: Partial<AuthorizationUser> | null): boolean {
  return Boolean(user?.id && user?.role);
}

export function hasAnyRole(user: Partial<AuthorizationUser> | null | undefined, allowedRoles: readonly string[]): boolean {
  return Boolean(user?.role && allowedRoles.includes(user.role));
}

export function isResourceOwner(userId: string | null | undefined, ownerId: string | null | undefined): boolean {
  return Boolean(userId && ownerId && userId === ownerId);
}

export function canAccessOwnedResource(
  user: Partial<AuthorizationUser> | null | undefined,
  ownerId: string | null | undefined,
  privilegedRoles: readonly string[],
): boolean {
  return isAuthenticatedUser(user) && (isResourceOwner(user?.id, ownerId) || hasAnyRole(user, privilegedRoles));
}
