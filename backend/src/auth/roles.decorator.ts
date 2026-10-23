import { SetMetadata } from '@nestjs/common';

/** Metadata key read by RolesGuard. */
export const ROLES_KEY = 'roles';

/** Roles recognised by the application (must match the Role enum in schema.prisma). */
export const ROLES = ['ADMIN', 'OFFICER', 'HEAD'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Restrict a route (or a whole controller) to the given roles.
 * Usage: @Roles('ADMIN')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
