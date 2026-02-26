import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import * as apiModule from '../api';

describe('Dashboard', () => {
  const onAuthExpired = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onAuthExpired.mockClear();
  });

  it('should show loading state initially', () => {
    vi.spyOn(apiModule, 'listEnvironments').mockImplementation(() => new Promise(() => {}));
    render(<Dashboard onAuthExpired={onAuthExpired} />);
    expect(screen.getByText('Loading environments...')).toBeInTheDocument();
  });

  it('should show environments after loading', async () => {
    vi.spyOn(apiModule, 'listEnvironments').mockResolvedValue([
      {
        environmentId: 'test-env',
        projectName: 'my-project',
        frontendUrl: 'https://test.cloudfront.net',
        apiUrl: 'https://api.test.com/prod',
        deployedAt: '2026-01-01',
        resources: [{ arn: 'arn:1', resourceType: 's3', tags: {} }],
      },
    ]);

    render(<Dashboard onAuthExpired={onAuthExpired} />);
    expect(await screen.findByText('test-env')).toBeInTheDocument();
    expect(screen.getByText('my-project')).toBeInTheDocument();
  });

  it('should show empty state when no environments', async () => {
    vi.spyOn(apiModule, 'listEnvironments').mockResolvedValue([]);
    render(<Dashboard onAuthExpired={onAuthExpired} />);
    expect(await screen.findByText('No environments found')).toBeInTheDocument();
  });

  it('should show error on API failure', async () => {
    vi.spyOn(apiModule, 'listEnvironments').mockRejectedValue(new Error('Network error'));
    render(<Dashboard onAuthExpired={onAuthExpired} />);
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('should show unknown error for non-Error rejections', async () => {
    vi.spyOn(apiModule, 'listEnvironments').mockRejectedValue('oops');
    render(<Dashboard onAuthExpired={onAuthExpired} />);
    expect(await screen.findByText('Failed to load environments')).toBeInTheDocument();
  });

  it('should show environment count', async () => {
    vi.spyOn(apiModule, 'listEnvironments').mockResolvedValue([
      {
        environmentId: 'env-1',
        projectName: 'proj',
        frontendUrl: '',
        apiUrl: '',
        deployedAt: '',
        resources: [],
      },
      {
        environmentId: 'env-2',
        projectName: 'proj',
        frontendUrl: '',
        apiUrl: '',
        deployedAt: '',
        resources: [],
      },
    ]);

    render(<Dashboard onAuthExpired={onAuthExpired} />);
    expect(await screen.findByText('2 deployed')).toBeInTheDocument();
  });

  it('should call onAuthExpired when token is expired', async () => {
    vi.spyOn(apiModule, 'listEnvironments').mockRejectedValue(new apiModule.AuthError());
    render(<Dashboard onAuthExpired={onAuthExpired} />);
    await vi.waitFor(() => {
      expect(onAuthExpired).toHaveBeenCalled();
    });
  });
});
