import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchEnvironments, deleteEnvironmentApi } from './api';
import * as configModule from './config';
import * as authModule from './auth';

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
      apiUrl: 'https://api.example.com/prod',
      cognitoClientId: 'client-123',
      cognitoRegion: 'us-east-1',
    });
    vi.spyOn(authModule, 'getStoredTokens').mockReturnValue({
      idToken: 'id-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  describe('fetchEnvironments', () => {
    it('calls API and returns environments', async () => {
      const envs = [{ environmentId: 'aaa', resourcePrefix: 'proj-aaa' }];
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ environments: envs }),
      } as Response);

      const result = await fetchEnvironments();
      expect(result).toEqual(envs);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/prod/api/environments',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'id-token' }),
        }),
      );
    });

    it('throws when not authenticated', async () => {
      vi.spyOn(authModule, 'getStoredTokens').mockReturnValue(null);
      await expect(fetchEnvironments()).rejects.toThrow('Not authenticated');
    });

    it('throws on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      } as Response);

      await expect(fetchEnvironments()).rejects.toThrow('API error 500');
    });
  });

  describe('deleteEnvironmentApi', () => {
    it('calls DELETE endpoint', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'deleted' }),
      } as Response);

      await deleteEnvironmentApi('proj-abc');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/prod/api/environments/proj-abc',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
