import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

interface MockEnvironment {
  environmentId: string;
  projectName: string;
  frontendUrl: string;
  apiUrl: string;
  deployedAt: string;
}

interface MockUseEnvironments {
  environments: MockEnvironment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  deleteEnvironment: (id: string) => Promise<void>;
}

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    getToken: () => 'mock-token',
    setToken: vi.fn(),
    config: null,
  }),
}));

let mockUseEnvironments: MockUseEnvironments = {
  environments: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
  deleteEnvironment: vi.fn(),
};

vi.mock('../../hooks/useEnvironments', () => ({
  useEnvironments: () => mockUseEnvironments,
}));

describe('Admin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnvironments = {
      environments: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      deleteEnvironment: vi.fn(),
    };
  });

  /**
   * Renders the Dashboard component wrapped in BrowserRouter
   * @returns Render result
   */
  function renderDashboard() {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  }

  it('should render Mission Control title', () => {
    renderDashboard();

    expect(screen.getByText('Mission Control')).toBeInTheDocument();
  });

  it('should show empty state when no environments exist', () => {
    renderDashboard();

    const headings = screen.getAllByText('No Environments Deployed');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should show loading state', () => {
    mockUseEnvironments.loading = true;

    renderDashboard();

    expect(screen.getByText('Loading environments...')).toBeInTheDocument();
  });

  it('should show error message when fetch fails', () => {
    mockUseEnvironments.error = 'Failed to load environments';

    renderDashboard();

    expect(screen.getByText('Failed to load environments')).toBeInTheDocument();
  });

  it('should render environment cards when environments exist', () => {
    mockUseEnvironments.environments = [
      {
        environmentId: 'env12345',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: new Date().toISOString(),
      },
      {
        environmentId: 'env67890',
        projectName: 'test-project',
        frontendUrl: 'https://d456.cloudfront.net',
        apiUrl: 'https://api456.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: new Date().toISOString(),
      },
    ];

    renderDashboard();

    expect(screen.getByText('env12345')).toBeInTheDocument();
    expect(screen.getByText('env67890')).toBeInTheDocument();
    expect(screen.getByText('Deployed Environments')).toBeInTheDocument();
  });
});
