import { useState, useEffect } from 'react';
import { loadConfig, type MissionControlConfig } from '../config';

const TOKEN_STORAGE_KEY = 'missionControlToken';

/**
 * Authentication hook for Mission Control
 * @returns Authentication state and methods
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<MissionControlConfig | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const appConfig = await loadConfig();
        if (appConfig.missionControl) {
          setConfig(appConfig.missionControl);

          // Check for existing token
          const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
          setIsAuthenticated(!!token);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Redirects to Cognito login page
   */
  const login = () => {
    if (!config) {
      console.error('Mission Control config not loaded');
      return;
    }

    const redirectUri = `${window.location.origin}/admin/callback`;
    const loginUrl =
      `https://${config.cognitoDomain}/login?` +
      `response_type=token&` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=openid+profile`;

    window.location.href = loginUrl;
  };

  /**
   * Logs out by clearing the token and redirecting to home
   */
  const logout = () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  /**
   * Gets the current JWT token
   * @returns JWT token or null
   */
  const getToken = (): string | null => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  };

  /**
   * Stores a JWT token
   * @param token - JWT token to store
   */
  const setToken = (token: string) => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    setIsAuthenticated(true);
  };

  return {
    isAuthenticated,
    loading,
    login,
    logout,
    getToken,
    setToken,
    config,
  };
}
