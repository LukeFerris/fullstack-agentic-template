import type { McConfig } from './types';

let cachedConfig: McConfig | null = null;

/**
 * Fetches runtime configuration from /config.json (uploaded to S3 during deployment).
 * @returns Mission Control configuration
 */
export async function loadConfig(): Promise<McConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const response = await fetch('/config.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  }

  const config = (await response.json()) as McConfig;

  if (!config.apiUrl || !config.cognitoClientId || !config.cognitoRegion) {
    throw new Error('Invalid config: missing required fields');
  }

  cachedConfig = config;
  return config;
}

/**
 * Resets the cached configuration (for testing).
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
