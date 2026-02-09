import { describe, it, expect } from 'vitest';
import { handler } from './index';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('Lambda Handler', () => {
  it('should return "Hello Universe!" message', async () => {
    const mockEvent = {} as APIGatewayProxyEvent;
    const mockContext = {
      awsRequestId: 'test-request-id',
    } as Context;

    const result = await handler(mockEvent, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Hello Universe!');
    expect(body.requestId).toBe('test-request-id');
    expect(body.timestamp).toBeDefined();
  });
});
