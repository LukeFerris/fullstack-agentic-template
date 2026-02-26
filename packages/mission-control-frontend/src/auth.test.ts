import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAuth, getToken, clearAuth, login, logout } from './auth';

const mockAuthenticateUser = vi.fn();

vi.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: vi.fn().mockImplementation(function () { return {}; }),
  CognitoUser: vi.fn().mockImplementation(function () {
    return { authenticateUser: mockAuthenticateUser };
  }),
  AuthenticationDetails: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('./config', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    apiUrl: 'https://api.example.com',
    cognitoDomain: 'auth.example.com',
    clientId: 'client123',
    userPoolId: 'us-east-1_test',
    redirectUri: 'https://app.example.com/admin/callback',
  }),
}));

describe('auth', () => {
  beforeEach(() => {
    clearAuth();
    sessionStorage.clear();
    mockAuthenticateUser.mockReset();
  });

  describe('initAuth', () => {
    it('should return false when no token available', () => {
      expect(initAuth()).toBe(false);
    });

    it('should restore from session storage', () => {
      sessionStorage.setItem('mc_auth', JSON.stringify({
        idToken: 'stored-token',
        expiresAt: Date.now() + 3600000,
      }));
      expect(initAuth()).toBe(true);
      expect(getToken()).toBe('stored-token');
    });

    it('should reject expired session storage token', () => {
      sessionStorage.setItem('mc_auth', JSON.stringify({
        idToken: 'expired-token',
        expiresAt: Date.now() - 1000,
      }));
      expect(initAuth()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return null when not authenticated', () => {
      expect(getToken()).toBeNull();
    });
  });

  describe('login', () => {
    it('should authenticate with Cognito and store token', async () => {
      mockAuthenticateUser.mockImplementation(
        (_details: unknown, callbacks: { onSuccess: (session: unknown) => void }) => {
          callbacks.onSuccess({
            getIdToken: () => ({
              getJwtToken: () => 'test-id-token',
              getExpiration: () => Math.floor(Date.now() / 1000) + 3600,
            }),
          });
        },
      );

      await login('admin', 'password');
      expect(getToken()).toBe('test-id-token');
      expect(sessionStorage.getItem('mc_auth')).not.toBeNull();
    });

    it('should reject on authentication failure', async () => {
      mockAuthenticateUser.mockImplementation(
        (_details: unknown, callbacks: { onFailure: (err: Error) => void }) => {
          callbacks.onFailure(new Error('Incorrect username or password.'));
        },
      );

      await expect(login('admin', 'wrong')).rejects.toThrow('Incorrect username or password.');
    });
  });

  describe('logout', () => {
    it('should clear auth state and session storage', () => {
      sessionStorage.setItem('mc_auth', JSON.stringify({
        idToken: 'test',
        expiresAt: Date.now() + 3600000,
      }));
      initAuth();
      expect(getToken()).toBe('test');

      logout();
      expect(getToken()).toBeNull();
      expect(sessionStorage.getItem('mc_auth')).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should clear auth state and session storage', () => {
      sessionStorage.setItem('mc_auth', 'test');
      clearAuth();
      expect(getToken()).toBeNull();
      expect(sessionStorage.getItem('mc_auth')).toBeNull();
    });
  });
});
