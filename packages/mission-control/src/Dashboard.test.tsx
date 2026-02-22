import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import * as apiModule from './api';
import type { EnvironmentRecord } from './types';

const mockEnv: EnvironmentRecord = {
  environmentId: 'abc123',
  projectName: 'proj',
  frontendUrl: 'https://front.example.com',
  apiUrl: 'https://api.example.com',
  deployedAt: '2024-06-15T10:30:00Z',
  resourcePrefix: 'proj-abc123',
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => cleanup());

describe('Dashboard', () => {
  it('shows loading state then environments', async () => {
    vi.spyOn(apiModule, 'fetchEnvironments').mockResolvedValue([mockEnv]);
    render(<Dashboard onLogout={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('proj-abc123')).toBeInTheDocument();
    });
    expect(screen.getByText('Deployed Environments (1)')).toBeInTheDocument();
  });

  it('shows empty state when no environments', async () => {
    vi.spyOn(apiModule, 'fetchEnvironments').mockResolvedValue([]);
    render(<Dashboard onLogout={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No environments deployed yet.')).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    vi.spyOn(apiModule, 'fetchEnvironments').mockRejectedValue(new Error('Fetch failed'));
    render(<Dashboard onLogout={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });
  });

  it('shows generic error for non-Error throws', async () => {
    vi.spyOn(apiModule, 'fetchEnvironments').mockRejectedValue('string error');
    render(<Dashboard onLogout={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load environments')).toBeInTheDocument();
    });
  });

  it('refreshes environments on Refresh click', async () => {
    const fetchSpy = vi.spyOn(apiModule, 'fetchEnvironments').mockResolvedValue([mockEnv]);
    const user = userEvent.setup();
    render(<Dashboard onLogout={vi.fn()} />);

    await waitFor(() => { expect(fetchSpy).toHaveBeenCalledOnce(); });
    await user.click(screen.getByText('Refresh'));
    await waitFor(() => { expect(fetchSpy).toHaveBeenCalledTimes(2); });
  });

  it('removes environment from list after delete', async () => {
    vi.spyOn(apiModule, 'fetchEnvironments').mockResolvedValue([mockEnv]);
    vi.spyOn(apiModule, 'deleteEnvironmentApi').mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<Dashboard onLogout={vi.fn()} />);
    await waitFor(() => { expect(screen.getByText('proj-abc123')).toBeInTheDocument(); });
    await user.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(screen.getByText('Deployed Environments (0)')).toBeInTheDocument();
    });
  });
});
