import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { AUTH_TOKEN_KEY } from '../../utils/auth';
import { buildTestJwt } from '../../../test/jwtFixture';

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to /login when no token is stored', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when the stored token is expired', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt(expiredExp));

    renderAt('/dashboard');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders the child route when the stored token is still valid', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt(futureExp));

    renderAt('/dashboard');

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('renders the child route when the stored token is malformed', () => {
    // Not a 3-part JWT — decode fails, so the presence fallback keeps it valid.
    localStorage.setItem(AUTH_TOKEN_KEY, 'not-a-jwt');

    renderAt('/dashboard');

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('renders the child route when the token has no exp claim', () => {
    // Valid JWT shape, but the payload carries no exp — treated as opaque/valid.
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt());

    renderAt('/dashboard');

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
