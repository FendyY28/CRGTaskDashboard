import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from './roles.decorator';

/** What `JwtStrategy.validate()` puts on `req.user`. */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: Role;
}

/** A request after JwtAuthGuard has run. */
export type AuthenticatedRequest = Request & { user?: Partial<AuthenticatedUser> };

/**
 * Actor identity, taken from the verified JWT only.
 *
 * Reading the id from `req.user` in one place means no controller can
 * accidentally prefer a client-supplied `userId`/`performedBy` from the body,
 * which would let anyone forge the audit trail.
 */
export function getAuthenticatedUserId(req: AuthenticatedRequest): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new BadRequestException('Sesi Anda tidak valid. Silakan Logout dan Login ulang.');
  }
  return userId;
}

/**
 * Injects the authenticated user's id:
 * `handler(@CurrentUserId() userId: string)`.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    getAuthenticatedUserId(ctx.switchToHttp().getRequest<AuthenticatedRequest>()),
);
