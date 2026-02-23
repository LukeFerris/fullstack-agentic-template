import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from './index';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import * as listEnvironmentsModule from './handlers/listEnvironments';
import * as deleteEnvironmentModule from './handlers/deleteEnvironment';

vi.mock('./handlers/listEnvironments');
vi.mock('./handlers/deleteEnvironment');

describe('Admin API Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /**
   * Test helper to create a mock API Gateway event
   * @param path - Request path
   * @param method - HTTP method
   * @param pathParameters - Path parameters
   * @returns Mock API Gateway event
   */
  function createMockEvent(
    path: string,
    method: string,
    pathParameters: Record<string, string> | null = null
  ): APIGatewayProxyEvent {
    return {
      path,
      httpMethod: method,
      pathParameters,
      headers: {},
      body: null,
      isBase64Encoded: false,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
      multiValueHeaders: {},
    };
  }

  it('should route GET /admin/environments to listEnvironments handler', async () => {
    const mockResponse = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environments: [] }),
    };

    vi.mocked(listEnvironmentsModule.listEnvironments).mockResolvedValue(mockResponse);

    const event = createMockEvent('/admin/environments', 'GET');
    const response = await handler(event);

    expect(listEnvironmentsModule.listEnvironments).toHaveBeenCalledTimes(1);
    expect(response).toEqual(mockResponse);
  });

  it('should route DELETE /admin/environments/{id} to deleteEnvironment handler', async () => {
    const mockResponse = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };

    vi.mocked(deleteEnvironmentModule.deleteEnvironment).mockResolvedValue(mockResponse);

    const event = createMockEvent('/admin/environments/abc12345', 'DELETE', { id: 'abc12345' });
    const response = await handler(event);

    expect(deleteEnvironmentModule.deleteEnvironment).toHaveBeenCalledWith('abc12345');
    expect(response).toEqual(mockResponse);
  });

  it('should return 404 for unknown routes', async () => {
    const event = createMockEvent('/unknown', 'GET');
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not Found');
    expect(body.message).toContain('GET /unknown');
  });

  it('should return 404 for unsupported HTTP methods', async () => {
    const event = createMockEvent('/admin/environments', 'POST');
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Not Found');
  });

  it('should return 404 for DELETE without path parameter', async () => {
    const event = createMockEvent('/admin/environments/', 'DELETE', null);
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
  });

  it('should include CORS headers in 404 responses', async () => {
    const event = createMockEvent('/unknown', 'GET');
    const response = await handler(event);

    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
  });

  it('should handle handler errors and return 500', async () => {
    const mockError = new Error('Internal handler error');
    vi.mocked(listEnvironmentsModule.listEnvironments).mockRejectedValue(mockError);

    const event = createMockEvent('/admin/environments', 'GET');
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Internal handler error');
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(listEnvironmentsModule.listEnvironments).mockRejectedValue('String error');

    const event = createMockEvent('/admin/environments', 'GET');
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('An unexpected error occurred');
  });

  it('should include CORS headers in error responses', async () => {
    vi.mocked(listEnvironmentsModule.listEnvironments).mockRejectedValue(new Error('Test error'));

    const event = createMockEvent('/admin/environments', 'GET');
    const response = await handler(event);

    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
  });

  it('should log request details', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(listEnvironmentsModule.listEnvironments).mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: '{}',
    });

    const event = createMockEvent('/admin/environments', 'GET');
    await handler(event);

    expect(consoleLog).toHaveBeenCalledWith('Received request:', {
      path: '/admin/environments',
      method: 'GET',
      pathParameters: null,
    });

    consoleLog.mockRestore();
  });
});
