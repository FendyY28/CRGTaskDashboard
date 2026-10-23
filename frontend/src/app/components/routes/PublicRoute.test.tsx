import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PublicRoute } from './PublicRoute';
import { AUTH_TOKEN_KEY } from '../../utils/auth';
import { buildTestJwt } from '../../../test/jwtFixture';

const renderAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<div>Login Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('PublicRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders login page when no token is stored', () => {
    renderAt('/login');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders login page (does NOT redirect to /dashboard) when token is expired', () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt(expiredExp));

    renderAt('/login');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when a valid token is stored', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(AUTH_TOKEN_KEY, buildTestJwt(futureExp));

    renderAt('/login');

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});

