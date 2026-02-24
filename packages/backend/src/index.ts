import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { routeRestRequest } from './router';
import { handleMcpRequest } from './mcp/server';
import { CORS_HEADERS } from './types';

/**
 * AWS Lambda handler that routes between the REST API and MCP protocol.
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns API Gateway proxy result
 */
export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.path === '/mcp') {
    return handleMcpRequest(event);
  }

  return routeRestRequest(event, context);
}
