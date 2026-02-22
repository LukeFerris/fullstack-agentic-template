import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

vi.mock('./list-environments', () => ({
  listEnvironments: vi.fn().mockResolvedValue({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ environments: [] }),
  }),
}));

vi.mock('./delete-environment', () => ({
  deleteEnvironment: vi.fn().mockResolvedValue({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'deleted' }),
  }),
}));

import { handler } from './index';
import { listEnvironments } from './list-environments';
import { deleteEnvironment } from './delete-environment';

const mockContext = { awsRequestId: 'test-123' } as Context;

/**
 * Creates a mock API Gateway event.
 * @param method - HTTP method
 * @param path - Request path
 * @returns Mock event
 */
function makeEvent(method: string, path: string): APIGatewayProxyEvent {
  return { httpMethod: method, path } as APIGatewayProxyEvent;
}

beforeEach(() => vi.clearAllMocks());

describe('handler routing', () => {
  it('routes GET /api/environments to listEnvironments', async () => {
    await handler(makeEvent('GET', '/api/environments'), mockContext);
    expect(listEnvironments).toHaveBeenCalledOnce();
  });

  it('routes DELETE /api/environments/my-env-123 to deleteEnvironment', async () => {
    await handler(makeEvent('DELETE', '/api/environments/my-env-123'), mockContext);
    expect(deleteEnvironment).toHaveBeenCalledWith('my-env-123');
  });

  it('returns 200 for OPTIONS requests', async () => {
    const result = await handler(makeEvent('OPTIONS', '/any'), mockContext);
    expect(result.statusCode).toBe(200);
  });

  it('returns 404 for unknown routes', async () => {
    const result = await handler(makeEvent('GET', '/unknown'), mockContext);
    expect(result.statusCode).toBe(404);
  });

  it('returns 404 for DELETE without valid ID', async () => {
    const result = await handler(makeEvent('DELETE', '/api/environments/'), mockContext);
    expect(result.statusCode).toBe(404);
  });
});
