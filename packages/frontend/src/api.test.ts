import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchHelloMessage } from './api';
import * as configModule from './config';

describe('fetchHelloMessage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and returns the hello message', async () => {
    vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
      apiUrl: 'https://api.example.com/prod',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Hello from Lambda',
        timestamp: '2024-01-01T00:00:00.000Z',
        requestId: 'req-123',
      }),
    } as Response);

    const result = await fetchHelloMessage();

    expect(result).toEqual({
      message: 'Hello from Lambda',
      timestamp: '2024-01-01T00:00:00.000Z',
      requestId: 'req-123',
    });
    expect(globalThis.fetch).toHaveBeenCalledWith('https://api.example.com/prod');
  });

  it('throws on non-ok API response', async () => {
    vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
      apiUrl: 'https://api.example.com/prod',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchHelloMessage()).rejects.toThrow(
      'API request failed: 500 Internal Server Error',
    );
  });

  it('propagates config loading errors', async () => {
    vi.spyOn(configModule, 'loadConfig').mockRejectedValue(
      new Error('Config load failed'),
    );

    await expect(fetchHelloMessage()).rejects.toThrow('Config load failed');
  });
});
