import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { listEnvironments } from './list-environments';
import { deleteEnvironment } from './delete-environment';
import { jsonResponse } from './response';

/**
 * Extracts the environment ID from a proxy path like /api/environments/{id}.
 * @param path - The request path
 * @returns The extracted ID or null
 */
function extractEnvironmentId(path: string): string | null {
  const match = path.match(/^\/api\/environments\/([a-zA-Z0-9-]+)$/);
  return match ? match[1] : null;
}

/**
 * AWS Lambda handler for Mission Control API.
 * @param event - API Gateway proxy event
 * @param _context - Lambda context
 * @returns API Gateway proxy result
 */
export async function handler(
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const path = event.path;

  if (method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  if (method === 'GET' && path === '/api/environments') {
    return listEnvironments();
  }

  if (method === 'DELETE') {
    const envId = extractEnvironmentId(path);
    if (envId) {
      return deleteEnvironment(envId);
    }
  }

  return jsonResponse(404, { error: 'Not found' });
}
