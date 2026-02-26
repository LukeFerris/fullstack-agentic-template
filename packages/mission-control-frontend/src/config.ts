export interface MCConfig {
  apiUrl: string;
  cognitoDomain: string;
  clientId: string;
  userPoolId: string;
  redirectUri: string;
}

let cachedConfig: MCConfig | null = null;

/**
 * Fetches runtime configuration from /config.json (uploaded to S3 during deployment).
 * @returns Mission Control configuration
 */
export async function loadConfig(): Promise<MCConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const response = await fetch('/config.json', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  }

  const config = (await response.json()) as MCConfig;

  if (!config.apiUrl || typeof config.apiUrl !== 'string') {
    throw new Error('Invalid config: missing or invalid apiUrl');
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
