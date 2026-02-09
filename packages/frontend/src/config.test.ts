import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, resetConfigCache } from './config';

describe('loadConfig', () => {
  beforeEach(() => {
    resetConfigCache();
    vi.restoreAllMocks();
  });

  it('fetches and returns config from /config.json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ apiUrl: 'https://api.example.com/prod' }),
    } as Response);

    const config = await loadConfig();

    expect(config).toEqual({ apiUrl: 'https://api.example.com/prod' });
    expect(globalThis.fetch).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
  });

  it('caches config after first fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ apiUrl: 'https://api.example.com/prod' }),
    } as Response);

    await loadConfig();
    await loadConfig();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(loadConfig()).rejects.toThrow('Failed to load config: 404 Not Found');
  });

  it('throws when apiUrl is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await expect(loadConfig()).rejects.toThrow('Invalid config: missing or invalid apiUrl');
  });

  it('throws when apiUrl is not a string', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ apiUrl: 123 }),
    } as Response);

    await expect(loadConfig()).rejects.toThrow('Invalid config: missing or invalid apiUrl');
  });

  it('re-fetches after resetConfigCache', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ apiUrl: 'https://api.example.com/prod' }),
    } as Response);

    await loadConfig();
    resetConfigCache();
    await loadConfig();

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
