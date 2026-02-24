import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { routeRestRequest } from './router';

/**
 * Creates a minimal API Gateway event for testing.
 * @param path - Request path
 * @param httpMethod - HTTP method
 * @returns A partial API Gateway event cast to the full type
 */
function createEvent(
  path: string,
  httpMethod: string,
): APIGatewayProxyEvent {
  return { path, httpMethod, headers: {} } as APIGatewayProxyEvent;
}

const mockContext = { awsRequestId: 'test-id' } as Context;

describe('routeRestRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should route GET / to hello handler', () => {
    const response = routeRestRequest(createEvent('/', 'GET'), mockContext);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello universe');
    expect(body.requestId).toBe('test-id');
  });

  it('should route GET /api/hello to hello handler', () => {
    const response = routeRestRequest(
      createEvent('/api/hello', 'GET'),
      mockContext,
    );
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello universe');
  });

  it('should return 404 for unknown paths', () => {
    const response = routeRestRequest(
      createEvent('/unknown', 'GET'),
      mockContext,
    );
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not Found');
  });

  it('should return 404 for POST to hello endpoint', () => {
    const response = routeRestRequest(
      createEvent('/api/hello', 'POST'),
      mockContext,
    );
    expect(response.statusCode).toBe(404);
  });
});
