import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, resetConfigCache } from './config';

const validConfig = {
  apiUrl: 'https://api.example.com',
  cognitoClientId: 'client-123',
  cognitoRegion: 'us-east-1',
};

const mockValidFetch = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => validConfig,
  } as Response);

beforeEach(() => {
  resetConfigCache();
  vi.restoreAllMocks();
});

describe('loadConfig success', () => {
  it('fetches and returns config from /config.json', async () => {
    mockValidFetch();
    const config = await loadConfig();
    expect(config.apiUrl).toBe('https://api.example.com');
    expect(config.cognitoClientId).toBe('client-123');
  });

  it('caches config after first fetch', async () => {
    mockValidFetch();
    await loadConfig();
    await loadConfig();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after resetConfigCache', async () => {
    mockValidFetch();
    await loadConfig();
    resetConfigCache();
    await loadConfig();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('loadConfig errors', () => {
  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 404, statusText: 'Not Found',
    } as Response);
    await expect(loadConfig()).rejects.toThrow('Failed to load config');
  });

  it('throws when required fields are missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ apiUrl: 'https://api.example.com' }),
    } as Response);
    await expect(loadConfig()).rejects.toThrow('Invalid config');
  });
});
