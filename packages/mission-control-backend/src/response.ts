import type { ApiResponse } from './types';

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

/**
 * Creates a JSON API Gateway response with CORS headers.
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway proxy result
 */
export function jsonResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}
