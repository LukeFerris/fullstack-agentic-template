import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listEnvironments, deleteEnvironment, AuthError } from './api';
import * as configModule from './config';
import * as authModule from './auth';

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
      apiUrl: 'https://api.example.com/prod',
      cognitoDomain: 'auth.example.com',
      clientId: 'test-client',
      userPoolId: 'us-east-1_test',
      redirectUri: 'https://app.example.com/admin/callback',
    });
  });

  describe('listEnvironments', () => {
    it('should fetch environments with auth header', async () => {
      vi.spyOn(authModule, 'getToken').mockReturnValue('test-token');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ environments: [{ environmentId: 'env-1' }] }),
      } as Response);

      const result = await listEnvironments();
      expect(result).toEqual([{ environmentId: 'env-1' }]);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/prod/admin/environments',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should throw AuthError when not authenticated', async () => {
      vi.spyOn(authModule, 'getToken').mockReturnValue(null);
      await expect(listEnvironments()).rejects.toThrow(AuthError);
    });

    it('should throw on API error', async () => {
      vi.spyOn(authModule, 'getToken').mockReturnValue('test-token');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(listEnvironments()).rejects.toThrow('API request failed: 500 Internal Server Error');
    });
  });

  describe('deleteEnvironment', () => {
    it('should send DELETE request with auth', async () => {
      vi.spyOn(authModule, 'getToken').mockReturnValue('test-token');
      const mockResult = { success: true, environmentId: 'env-1', deletedResources: ['arn:1'] };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      } as Response);

      const result = await deleteEnvironment('env-1');
      expect(result).toEqual(mockResult);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/prod/admin/environments/env-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should encode environment ID in URL', async () => {
      vi.spyOn(authModule, 'getToken').mockReturnValue('test-token');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await deleteEnvironment('env/with/slashes');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('env%2Fwith%2Fslashes'),
        expect.anything(),
      );
    });

    it('should throw AuthError when not authenticated', async () => {
      vi.spyOn(authModule, 'getToken').mockReturnValue(null);
      await expect(deleteEnvironment('env-1')).rejects.toThrow(AuthError);
    });
  });
});
