import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Standard CORS headers for API responses.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Creates a JSON API Gateway response with CORS headers.
 * @param statusCode - HTTP status code
 * @param body - Response body object to serialize as JSON
 * @returns Formatted API Gateway proxy result
 */
export function createJsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify(body),
  };
}
