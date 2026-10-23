import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

function contextFor(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(roles: string[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows routes that have no @Roles metadata', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(contextFor({ role: 'HEAD' }))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    expect(guard.canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
  });

  it('rejects a non-admin on an ADMIN-only route', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    expect(() => guard.canActivate(contextFor({ role: 'OFFICER' }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(contextFor({ role: 'HEAD' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects read-only HEAD on a write route', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN', 'OFFICER']));
    expect(() => guard.canActivate(contextFor({ role: 'HEAD' }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws Unauthorized when no user is attached to the request', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('reads metadata from both the handler and the controller', () => {
    const reflector = reflectorReturning(['ADMIN']);
    const guard = new RolesGuard(reflector);
    const ctx = contextFor({ role: 'ADMIN' });

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });
});
