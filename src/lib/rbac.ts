import { UserResource } from '@clerk/types';

export type AllowedRole = 'admin' | 'compliance' | 'ops' | 'viewer';

export function userHasAnyRole(user: UserResource | null | undefined, allowedRoles: AllowedRole[]): boolean {
  if (!user) return false;
  // Prefer organization membership roles if available
  const orgMemberships = (user.organizationMemberships || []) as Array<{ role?: string }>;
  const orgRoles = orgMemberships
    .map((m) => (m.role || '').toLowerCase())
    .filter(Boolean);
  const userPublicMetadata = (user.publicMetadata || {}) as Record<string, unknown>;
  const userRoles = Array.isArray(userPublicMetadata.roles)
    ? (userPublicMetadata.roles as string[]).map((r) => r.toLowerCase())
    : [];

  const allRoles = new Set<string>([...orgRoles, ...userRoles]);
  return allowedRoles.some((r) => allRoles.has(r));
}


