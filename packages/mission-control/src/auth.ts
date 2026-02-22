import type { AuthTokens } from './types';
import { loadConfig } from './config';

const TOKEN_KEY = 'mc_auth_tokens';

/**
 * Authenticates with Cognito using username and password via the JSON API.
 * @param username - The username
 * @param password - The password
 * @returns Authentication tokens
 */
export async function login(username: string, password: string): Promise<AuthTokens> {
  const config = await loadConfig();
  const endpoint = `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.cognitoClientId,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error((body as { message?: string }).message ?? 'Authentication failed');
  }

  const data = (await response.json()) as { AuthenticationResult: AuthResultPayload };
  const result = data.AuthenticationResult;

  const tokens: AuthTokens = {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
  };

  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  return tokens;
}

/**
 * Returns stored auth tokens, or null if not logged in.
 * @returns Stored tokens or null
 */
export function getStoredTokens(): AuthTokens | null {
  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as AuthTokens;
}

/**
 * Clears stored auth tokens.
 */
export function logout(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

interface AuthResultPayload {
  IdToken: string;
  AccessToken: string;
  RefreshToken: string;
}
