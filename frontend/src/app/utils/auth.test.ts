import { describe, expect, it, beforeEach } from 'vitest';

import { AUTH_TOKEN_KEY, getAuthToken, hasValidAuthToken } from './auth';
import { buildTestJwt } from '../../test/jwtFixture';

describe('getAuthToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when storage is empty', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('returns the stored token when present', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'abc123');
    expect(getAuthToken()).toBe('abc123');
  });
});

describe('hasValidAuthToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no token is stored', () => {
    expect(hasValidAuthToken()).toBe(false);
  });

  it('returns false when the token is expired', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt(expiredExp));
    expect(hasValidAuthToken()).toBe(false);
  });

  it('returns true when the token has not expired', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt(futureExp));
    expect(hasValidAuthToken()).toBe(true);
  });

  it('returns true for an opaque token without an exp claim', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt());
    expect(hasValidAuthToken()).toBe(true);
  });

  it('returns true for a malformed token', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'not-a-jwt');
    expect(hasValidAuthToken()).toBe(true);
  });
});
