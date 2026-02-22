import type { EnvironmentRecord } from './types';
import { loadConfig } from './config';
import { getStoredTokens } from './auth';

/**
 * Makes an authenticated API request to the Mission Control backend.
 * @param path - API path
 * @param method - HTTP method
 * @returns Parsed JSON response
 */
async function apiRequest(path: string, method: string): Promise<unknown> {
  const config = await loadConfig();
  const tokens = getStoredTokens();

  if (!tokens) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: tokens.idToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  return response.json();
}

/**
 * Fetches all deployed environments from the API.
 * @returns List of environment records
 */
export async function fetchEnvironments(): Promise<EnvironmentRecord[]> {
  const data = (await apiRequest('/api/environments', 'GET')) as {
    environments: EnvironmentRecord[];
  };
  return data.environments;
}

/**
 * Deletes a deployed environment by its resource prefix.
 * @param resourcePrefix - The environment's resource prefix
 */
export async function deleteEnvironmentApi(resourcePrefix: string): Promise<void> {
  await apiRequest(`/api/environments/${resourcePrefix}`, 'DELETE');
}
