import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleHello } from './hello';

describe('handleHello', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return status 200', () => {
    const response = handleHello('test-request-id');
    expect(response.statusCode).toBe(200);
  });

  it('should include the request ID in the body', () => {
    const response = handleHello('req-123');
    const body = JSON.parse(response.body);
    expect(body.requestId).toBe('req-123');
  });

  it('should include the hello message', () => {
    const response = handleHello('req-123');
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Hello universe');
  });

  it('should include a timestamp', () => {
    const response = handleHello('req-123');
    const body = JSON.parse(response.body);
    expect(body.timestamp).toBe('2025-06-15T12:00:00.000Z');
  });

  it('should include CORS headers', () => {
    const response = handleHello('req-123');
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
