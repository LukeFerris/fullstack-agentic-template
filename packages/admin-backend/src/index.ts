import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listEnvironments } from './handlers/listEnvironments';
import { deleteEnvironment } from './handlers/deleteEnvironment';

/**
 * Main Lambda handler for Mission Control Admin API
 * Routes requests to appropriate handlers based on path and method
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Received request:', {
    path: event.path,
    method: event.httpMethod,
    pathParameters: event.pathParameters,
  });

  const { path, httpMethod, pathParameters } = event;

  try {
    // GET /admin/environments - List all environments
    if (path === '/admin/environments' && httpMethod === 'GET') {
      return await listEnvironments();
    }

    // DELETE /admin/environments/{id} - Delete an environment
    if (
      path.startsWith('/admin/environments/') &&
      httpMethod === 'DELETE' &&
      pathParameters?.id
    ) {
      return await deleteEnvironment(pathParameters.id);
    }

    // Route not found
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Not Found',
        message: `Route ${httpMethod} ${path} not found`,
      }),
    };
  } catch (error) {
    console.error('Unhandled error in handler:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message:
          error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
    };
  }
}
