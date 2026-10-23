import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type Role } from './roles.decorator';

/**
 * Enforces @Roles(...) metadata. Must run AFTER JwtAuthGuard, because it relies
 * on req.user being populated by the passport JWT strategy.
 *
 * A route without @Roles metadata is allowed through unchanged, so adding this
 * guard does not change behaviour for endpoints that only require a login.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      // Defensive: JwtAuthGuard should already have rejected this request.
      throw new UnauthorizedException('Sesi tidak valid. Silakan login ulang.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Anda tidak memiliki hak akses untuk aksi ini.',
      );
    }

    return true;
  }
}
