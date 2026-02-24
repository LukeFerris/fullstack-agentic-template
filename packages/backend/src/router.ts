import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { handleHello } from './handlers/hello';
import { createJsonResponse } from './types';

/**
 * Routes REST API requests to the appropriate handler.
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns API Gateway response from the matched handler
 */
export function routeRestRequest(
  event: APIGatewayProxyEvent,
  context: Context,
): APIGatewayProxyResult {
  const { path, httpMethod } = event;

  if ((path === '/api/hello' || path === '/') && httpMethod === 'GET') {
    return handleHello(context.awsRequestId);
  }

  return createJsonResponse(404, {
    error: 'Not Found',
    message: `Route ${httpMethod} ${path} not found`,
  });
}
