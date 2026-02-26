import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { loadConfig } from './config';

interface AuthState {
  idToken: string;
  expiresAt: number;
}

let authState: AuthState | null = null;
let userPool: CognitoUserPool | null = null;

async function getUserPool(): Promise<CognitoUserPool> {
  if (userPool) return userPool;
  const config = await loadConfig();
  userPool = new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
  });
  return userPool;
}

/**
 * Initializes auth by checking session storage for a stored token.
 * @returns True if authenticated
 */
export function initAuth(): boolean {
  const stored = sessionStorage.getItem('mc_auth');
  if (stored) {
    const parsed = JSON.parse(stored) as AuthState;
    if (parsed.expiresAt > Date.now()) {
      authState = parsed;
      return true;
    }
    sessionStorage.removeItem('mc_auth');
  }
  return false;
}

/**
 * Returns the current ID token, or null if not authenticated.
 * @returns The ID token string or null
 */
export function getToken(): string | null {
  if (authState && authState.expiresAt > Date.now()) {
    return authState.idToken;
  }
  return null;
}

/**
 * Authenticates directly against Cognito using SRP.
 * @param username - The username
 * @param password - The password
 * @returns Resolves on success, rejects with error message on failure
 */
export async function login(username: string, password: string): Promise<void> {
  const pool = await getUserPool();

  const cognitoUser = new CognitoUser({
    Username: username,
    Pool: pool,
  });

  const authDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  return new Promise<void>((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess(session: CognitoUserSession) {
        const idToken = session.getIdToken().getJwtToken();
        const expiresAt = session.getIdToken().getExpiration() * 1000;
        authState = { idToken, expiresAt };
        sessionStorage.setItem('mc_auth', JSON.stringify(authState));
        resolve();
      },
      onFailure(err: Error) {
        reject(new Error(err.message || 'Authentication failed'));
      },
    });
  });
}

/**
 * Logs out by clearing auth state.
 */
export function logout(): void {
  authState = null;
  sessionStorage.removeItem('mc_auth');
}

/**
 * Clears auth state without side effects (for testing).
 */
export function clearAuth(): void {
  authState = null;
  userPool = null;
  sessionStorage.removeItem('mc_auth');
}
