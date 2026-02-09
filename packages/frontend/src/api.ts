import { loadConfig } from './config';

export interface HelloResponse {
  message: string;
  timestamp: string;
  requestId: string;
}

/**
 * Calls the backend API hello endpoint.
 * @returns The hello response from Lambda
 */
export async function fetchHelloMessage(): Promise<HelloResponse> {
  const config = await loadConfig();

  const response = await fetch(config.apiUrl);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as HelloResponse;
}
