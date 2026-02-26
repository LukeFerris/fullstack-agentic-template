import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, resetConfigCache } from './config';

describe('loadConfig', () => {
  beforeEach(() => {
    resetConfigCache();
    vi.restoreAllMocks();
  });

  it('should fetch and return config', async () => {
    const mockConfig = {
      apiUrl: 'https://api.example.com',
      cognitoDomain: 'auth.example.com',
      clientId: 'test-client',
      userPoolId: 'us-east-1_test',
      redirectUri: 'https://app.example.com/admin/callback',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    } as Response);

    const result = await loadConfig();
    expect(result).toEqual(mockConfig);
    expect(fetch).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
  });

  it('should cache the config after first load', async () => {
    const mockConfig = {
      apiUrl: 'https://api.example.com',
      cognitoDomain: 'auth.example.com',
      clientId: 'test-client',
      userPoolId: 'us-east-1_test',
      redirectUri: 'https://app.example.com/admin/callback',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    } as Response);

    await loadConfig();
    await loadConfig();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(loadConfig()).rejects.toThrow('Failed to load config: 404 Not Found');
  });

  it('should throw on missing apiUrl', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(loadConfig()).rejects.toThrow('Invalid config: missing or invalid apiUrl');
  });

  it('should throw on non-string apiUrl', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ apiUrl: 123 }),
    } as Response);

    await expect(loadConfig()).rejects.toThrow('Invalid config: missing or invalid apiUrl');
  });
});
