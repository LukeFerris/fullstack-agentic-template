import { describe, it, expect } from 'vitest';
import { createJsonResponse, CORS_HEADERS } from './types';

describe('CORS_HEADERS', () => {
  it('should include Access-Control-Allow-Origin wildcard', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
  });

  it('should include allowed methods', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Methods']).toBe(
      'GET, POST, OPTIONS',
    );
  });

  it('should include allowed headers', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Headers']).toBe('Content-Type');
  });
});

describe('createJsonResponse', () => {
  it('should return correct status code', () => {
    const response = createJsonResponse(200, { ok: true });
    expect(response.statusCode).toBe(200);
  });

  it('should serialize body as JSON', () => {
    const body = { message: 'hello', count: 42 };
    const response = createJsonResponse(200, body);
    expect(JSON.parse(response.body)).toEqual(body);
  });

  it('should include Content-Type header', () => {
    const response = createJsonResponse(200, {});
    expect(response.headers?.['Content-Type']).toBe('application/json');
  });

  it('should include CORS headers', () => {
    const response = createJsonResponse(200, {});
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  it('should work with error status codes', () => {
    const response = createJsonResponse(404, { error: 'Not Found' });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'Not Found' });
  });
});
