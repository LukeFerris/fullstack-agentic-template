import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import type { EnvironmentRecord, ApiResponse } from './types';
import { REGISTRY_PREFIX } from './types';
import { jsonResponse } from './response';

const ssm = new SSMClient({});

/**
 * Fetches all environment records from SSM parameter store.
 * @returns Array of environment records
 */
async function fetchEnvironments(): Promise<EnvironmentRecord[]> {
  const environments: EnvironmentRecord[] = [];
  let nextToken: string | undefined;

  do {
    const command = new GetParametersByPathCommand({
      Path: REGISTRY_PREFIX,
      Recursive: false,
      NextToken: nextToken,
    });
    const result = await ssm.send(command);

    for (const param of result.Parameters ?? []) {
      if (param.Value) {
        environments.push(JSON.parse(param.Value) as EnvironmentRecord);
      }
    }
    nextToken = result.NextToken;
  } while (nextToken);

  return environments;
}

/**
 * Handles GET /api/environments - lists all deployed environments.
 * @returns API response with environment list
 */
export async function listEnvironments(): Promise<ApiResponse> {
  const environments = await fetchEnvironments();
  const sorted = environments.sort((a, b) => b.deployedAt.localeCompare(a.deployedAt));
  return jsonResponse(200, { environments: sorted });
}
