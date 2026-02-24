import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHelloMessage } from './helloService';

describe('getHelloMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return a message field', () => {
    const result = getHelloMessage();
    expect(result.message).toBe('Hello universe');
  });

  it('should return a timestamp in ISO format', () => {
    const result = getHelloMessage();
    expect(result.timestamp).toBe('2025-06-15T12:00:00.000Z');
  });

  it('should return an object with message and timestamp keys only', () => {
    const result = getHelloMessage();
    expect(Object.keys(result).sort()).toEqual(['message', 'timestamp']);
  });
});
