import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEnvironments } from './useEnvironments';
import * as config from '../config';
import * as useAuthModule from './useAuth';

vi.mock('../config');
vi.mock('./useAuth');

globalThis.fetch = vi.fn();

describe('useEnvironments', () => {
  const mockConfig = {
    apiUrl: 'https://api.example.com',
    missionControl: {
      apiUrl: 'https://mc-api.example.com',
      cognitoDomain: 'auth.example.com',
      clientId: 'test-client-id',
      userPoolId: 'us-east-1_testpool',
    },
  };

  const mockEnvironments = [
    {
      environmentId: 'env12345',
      projectName: 'test-project',
      frontendUrl: 'https://d123.cloudfront.net',
      apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
      deployedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      getToken: () => 'test-token',
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
      config: mockConfig.missionControl,
    });
  });

  it('should fetch environments on mount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ environments: mockEnvironments }),
    } as Response);

    const { result } = renderHook(() => useEnvironments());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.environments).toEqual(mockEnvironments);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.environments).toEqual([]);
    consoleError.mockRestore();
  });

  it('should handle non-ok response', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch: Unauthorized');
    consoleError.mockRestore();
  });

  it('should handle missing token', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      getToken: () => null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
      config: mockConfig.missionControl,
    });

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Not authenticated');
    consoleError.mockRestore();
  });

  it('should handle missing missionControl config', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(config.loadConfig).mockResolvedValue({ apiUrl: 'https://api.example.com' });

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Mission Control not configured');
    consoleError.mockRestore();
  });

  it('should handle empty environments array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ environments: [] }),
    } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.environments).toEqual([]);
  });

  it('should handle missing environments field in response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.environments).toEqual([]);
  });

  it('should delete environment successfully', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ environments: mockEnvironments }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(1);
    });

    await result.current.deleteEnvironment('env12345');

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(0);
    });
  });

  it('should throw error on delete failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ environments: mockEnvironments }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Deletion failed' }),
      } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(1);
    });

    await expect(result.current.deleteEnvironment('env12345')).rejects.toThrow('Deletion failed');

    await waitFor(() => {
      expect(result.current.error).toBe('Deletion failed');
    });

    consoleError.mockRestore();
  });

  it('should handle delete with missing token', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockGetToken = vi.fn<() => string | null>(() => 'test-token');
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      getToken: mockGetToken,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setToken: vi.fn(),
      config: mockConfig.missionControl,
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ environments: mockEnvironments }),
    } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(1);
    });

    mockGetToken.mockReturnValue(null);

    await expect(result.current.deleteEnvironment('env12345')).rejects.toThrow('Not authenticated');
    consoleError.mockRestore();
  });

  it('should refetch environments', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ environments: mockEnvironments }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ environments: [...mockEnvironments, { ...mockEnvironments[0], environmentId: 'env67890' }] }),
      } as Response);

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(1);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(2);
    });
  });

  it('should handle non-Error exceptions in fetch', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockRejectedValueOnce('String error');

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load');
    consoleError.mockRestore();
  });

  it('should handle non-Error exceptions in delete', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ environments: mockEnvironments }),
      } as Response)
      .mockRejectedValueOnce('String error');

    const { result } = renderHook(() => useEnvironments());

    await waitFor(() => {
      expect(result.current.environments).toHaveLength(1);
    });

    await expect(result.current.deleteEnvironment('env12345')).rejects.toBe('String error');

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to delete');
    });

    consoleError.mockRestore();
  });
});
