import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import * as config from '../config';

vi.mock('../config');

describe('useAuth', () => {
  const mockConfig = {
    apiUrl: 'https://api.example.com',
    missionControl: {
      apiUrl: 'https://mc-api.example.com',
      cognitoDomain: 'auth.example.com',
      clientId: 'test-client-id',
      userPoolId: 'us-east-1_testpool',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    delete (window as any).location;
    (window as any).location = { href: '', origin: 'https://example.com' };
  });

  it('should initialize with loading state', () => {
    vi.mocked(config.loadConfig).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should load config and check for token', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.config).toEqual(mockConfig.missionControl);
  });

  it('should detect existing token in sessionStorage', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);
    sessionStorage.setItem('missionControlToken', 'test-token');

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle config load error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(config.loadConfig).mockRejectedValue(new Error('Config load failed'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(consoleError).toHaveBeenCalledWith('Failed to load config:', expect.any(Error));
    expect(result.current.config).toBeNull();
    consoleError.mockRestore();
  });

  it('should redirect to Cognito on login', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.login();

    expect(window.location.href).toContain('https://auth.example.com/login');
    expect(window.location.href).toContain('client_id=test-client-id');
    expect(window.location.href).toContain('response_type=token');
    expect(window.location.href).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fadmin%2Fcallback');
  });

  it('should not redirect if config not loaded', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(config.loadConfig).mockResolvedValue({ apiUrl: 'https://api.example.com' });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.login();

    expect(window.location.href).toBe('');
    expect(consoleError).toHaveBeenCalledWith('Mission Control config not loaded');
    consoleError.mockRestore();
  });

  it('should logout and clear token', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);
    sessionStorage.setItem('missionControlToken', 'test-token');

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    result.current.logout();

    expect(sessionStorage.getItem('missionControlToken')).toBeNull();
    expect(window.location.href).toBe('/');
  });

  it('should get token from sessionStorage', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);
    sessionStorage.setItem('missionControlToken', 'test-token-123');

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getToken()).toBe('test-token-123');
  });

  it('should return null when no token exists', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getToken()).toBeNull();
  });

  it('should set token and update authenticated state', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);

    result.current.setToken('new-token');

    await waitFor(() => {
      expect(sessionStorage.getItem('missionControlToken')).toBe('new-token');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
