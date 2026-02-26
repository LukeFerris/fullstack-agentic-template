import { loadConfig } from './config';
import { getToken } from './auth';

export class AuthError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'AuthError';
  }
}

export interface Environment {
  environmentId: string;
  projectName: string;
  frontendUrl: string;
  apiUrl: string;
  deployedAt: string;
  resources: ResourceInfo[];
}

export interface ResourceInfo {
  arn: string;
  resourceType: string;
  tags: Record<string, string>;
}

export interface DeleteResult {
  success: boolean;
  environmentId: string;
  deletedResources: string[];
}

/**
 * Makes an authenticated request to the admin API.
 * @param path - API path
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const config = await loadConfig();
  const token = getToken();

  if (!token) {
    throw new AuthError();
  }

  const baseUrl = config.apiUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

/**
 * Fetches the list of deployed environments.
 * @returns List of environments
 */
export async function listEnvironments(): Promise<Environment[]> {
  const result = await adminRequest<{ environments: Environment[] }>('/admin/environments');
  return result.environments;
}

/**
 * Deletes a deployed environment and all its resources.
 * @param environmentId - The environment ID to delete
 * @returns Deletion result
 */
export async function deleteEnvironment(environmentId: string): Promise<DeleteResult> {
  return adminRequest<DeleteResult>(`/admin/environments/${encodeURIComponent(environmentId)}`, {
    method: 'DELETE',
  });
}
