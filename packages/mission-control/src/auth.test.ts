import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, getStoredTokens, logout } from './auth';
import * as configModule from './config';

const mockCognitoSuccess = {
  ok: true,
  json: async () => ({
    AuthenticationResult: {
      IdToken: 'id-token',
      AccessToken: 'access-token',
      RefreshToken: 'refresh-token',
    },
  }),
} as Response;

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
    apiUrl: 'https://api.example.com',
    cognitoClientId: 'client-123',
    cognitoRegion: 'us-east-1',
  });
});

describe('login', () => {
  it('calls Cognito endpoint and stores tokens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockCognitoSuccess);
    const tokens = await login('admin', 'password');
    expect(tokens.idToken).toBe('id-token');
    expect(tokens.accessToken).toBe('access-token');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://cognito-idp.us-east-1.amazonaws.com/',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on auth failure with message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Incorrect username or password.' }),
    } as Response);
    await expect(login('admin', 'wrong')).rejects.toThrow('Incorrect username or password.');
  });

  it('throws generic message when no error message returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);
    await expect(login('admin', 'wrong')).rejects.toThrow('Authentication failed');
  });
});

describe('getStoredTokens', () => {
  it('returns null when no tokens stored', () => {
    expect(getStoredTokens()).toBeNull();
  });

  it('returns tokens after login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockCognitoSuccess);
    await login('admin', 'password');
    expect(getStoredTokens()?.idToken).toBe('id-token');
  });
});

describe('logout', () => {
  it('clears stored tokens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockCognitoSuccess);
    await login('admin', 'password');
    logout();
    expect(getStoredTokens()).toBeNull();
  });
});
