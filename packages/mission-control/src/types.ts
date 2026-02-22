/**
 * A deployed environment record from the API.
 */
export interface EnvironmentRecord {
  environmentId: string;
  projectName: string;
  frontendUrl: string;
  apiUrl: string;
  deployedAt: string;
  resourcePrefix: string;
}

/**
 * Authentication tokens returned by Cognito.
 */
export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Runtime configuration loaded from config.json.
 */
export interface McConfig {
  apiUrl: string;
  cognitoClientId: string;
  cognitoRegion: string;
}
