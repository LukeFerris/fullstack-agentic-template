import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import * as useAuthModule from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('ProtectedRoute', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state when auth is loading', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: true,
      login: mockLogin,
      logout: vi.fn(),
      getToken: () => null,
      setToken: vi.fn(),
      config: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
      getToken: () => 'test-token',
      setToken: vi.fn(),
      config: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
      getToken: () => null,
      setToken: vi.fn(),
      config: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should not redirect while still loading', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      loading: true,
      login: mockLogin,
      logout: vi.fn(),
      getToken: () => null,
      setToken: vi.fn(),
      config: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should render complex children', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
      getToken: () => 'test-token',
      setToken: vi.fn(),
      config: null,
    });

    render(
      <ProtectedRoute>
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Button</button>
        </div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument();
  });
});
