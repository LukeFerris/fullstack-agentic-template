import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from './index';

const mockContext = { awsRequestId: 'test-request-id' } as Context;

/**
 * Creates a minimal API Gateway event for testing.
 * @param overrides - Partial event properties to override defaults
 * @returns A full API Gateway event with defaults applied
 */
function createEvent(
  overrides: Partial<APIGatewayProxyEvent>,
): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    body: null,
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('handler - CORS', () => {
  it('should return 204 for OPTIONS preflight', async () => {
    const response = await handler(
      createEvent({ httpMethod: 'OPTIONS', path: '/api/hello' }),
      mockContext,
    );
    expect(response.statusCode).toBe(204);
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(response.body).toBe('');
  });
});

describe('handler - REST routing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should route GET / to REST handler', async () => {
    const response = await handler(
      createEvent({ httpMethod: 'GET', path: '/' }),
      mockContext,
    );
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello universe');
    expect(body.requestId).toBe('test-request-id');
  });

  it('should return 404 for unknown REST paths', async () => {
    const response = await handler(
      createEvent({ httpMethod: 'GET', path: '/unknown' }),
      mockContext,
    );
    expect(response.statusCode).toBe(404);
  });
});

describe('handler - MCP routing', () => {
  it('should route /mcp POST to MCP handler', async () => {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    };

    const response = await handler(
      createEvent({
        httpMethod: 'POST',
        path: '/mcp',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(initRequest),
      }),
      mockContext,
    );
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.result.serverInfo.name).toBe('fullstack-template-api');
  });

  it('should return 405 for GET /mcp', async () => {
    const response = await handler(
      createEvent({ httpMethod: 'GET', path: '/mcp' }),
      mockContext,
    );
    expect(response.statusCode).toBe(405);
  });
});
