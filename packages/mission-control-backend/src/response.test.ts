import { describe, it, expect } from 'vitest';
import { jsonResponse } from './response';

describe('jsonResponse', () => {
  it('returns correct status code and body', () => {
    const result = jsonResponse(200, { hello: 'world' });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ hello: 'world' });
  });

  it('includes CORS headers', () => {
    const result = jsonResponse(404, { error: 'not found' });
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(result.headers['Access-Control-Allow-Methods']).toBe('GET,DELETE,OPTIONS');
  });

  it('serializes arrays', () => {
    const result = jsonResponse(200, [1, 2, 3]);
    expect(JSON.parse(result.body)).toEqual([1, 2, 3]);
  });
});
