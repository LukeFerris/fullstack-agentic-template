import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { toWebRequest, toApiGatewayResponse } from './adapter';

describe('toWebRequest - method and URL', () => {
  it('should set the correct HTTP method', () => {
    const event = {
      httpMethod: 'POST',
      path: '/mcp',
      headers: {},
      body: '{}',
    } as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    expect(request.method).toBe('POST');
  });

  it('should construct the URL from the path', () => {
    const event = {
      httpMethod: 'GET',
      path: '/api/hello',
      headers: {},
    } as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    expect(request.url).toBe('https://lambda.local/api/hello');
  });
});

describe('toWebRequest - headers', () => {
  it('should forward headers from the event', () => {
    const event = {
      httpMethod: 'POST',
      path: '/mcp',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: '{}',
    } as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    expect(request.headers.get('content-type')).toBe('application/json');
    expect(request.headers.get('accept')).toBe('text/plain');
  });

  it('should add default Accept header when none provided', () => {
    const event = {
      httpMethod: 'POST',
      path: '/mcp',
      headers: {},
      body: '{}',
    } as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    expect(request.headers.get('accept')).toBe(
      'application/json, text/event-stream',
    );
  });

  it('should skip null header values', () => {
    const event = {
      httpMethod: 'GET',
      path: '/',
      headers: { 'X-Present': 'yes', 'X-Null': null },
    } as unknown as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    expect(request.headers.get('x-present')).toBe('yes');
    expect(request.headers.get('x-null')).toBeNull();
  });
});

describe('toWebRequest - body', () => {
  it('should include the request body when present', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/mcp',
      headers: {},
      body: '{"jsonrpc":"2.0"}',
    } as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    const text = await request.text();
    expect(text).toBe('{"jsonrpc":"2.0"}');
  });

  it('should handle null body', () => {
    const event = {
      httpMethod: 'GET',
      path: '/',
      headers: {},
      body: null,
    } as APIGatewayProxyEvent;

    const request = toWebRequest(event);
    expect(request.body).toBeNull();
  });
});

describe('toApiGatewayResponse', () => {
  it('should convert status code', async () => {
    const webResponse = new Response('OK', { status: 200 });
    const result = await toApiGatewayResponse(webResponse);
    expect(result.statusCode).toBe(200);
  });

  it('should convert response body to string', async () => {
    const webResponse = new Response('{"result":"ok"}', { status: 200 });
    const result = await toApiGatewayResponse(webResponse);
    expect(result.body).toBe('{"result":"ok"}');
  });

  it('should convert response headers', async () => {
    const webResponse = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
    });
    const result = await toApiGatewayResponse(webResponse);
    expect(result.headers?.['content-type']).toBe('application/json');
    expect(result.headers?.['x-custom']).toBe('value');
  });

  it('should handle error status codes', async () => {
    const webResponse = new Response('Not Found', { status: 404 });
    const result = await toApiGatewayResponse(webResponse);
    expect(result.statusCode).toBe(404);
    expect(result.body).toBe('Not Found');
  });
});
