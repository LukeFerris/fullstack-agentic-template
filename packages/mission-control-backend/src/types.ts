/**
 * Metadata for a deployed environment stored in SSM.
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
 * Standard API response envelope.
 */
export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** SSM parameter path prefix for environment registry. */
export const REGISTRY_PREFIX = '/mission-control/environments/';
