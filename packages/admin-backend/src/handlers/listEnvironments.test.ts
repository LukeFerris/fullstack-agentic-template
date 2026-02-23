import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listEnvironments } from './listEnvironments';
import * as resourceDiscovery from '../services/resourceDiscovery';

vi.mock('../services/resourceDiscovery');

describe('listEnvironments handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 500 when PROJECT_NAME not set', async () => {
    delete process.env.PROJECT_NAME;

    const result = await listEnvironments();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'Configuration Error',
      message: 'PROJECT_NAME environment variable is not set',
    });
  });

  it('should return list of environments successfully', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockEnvironments = [
      {
        environmentId: 'env12345',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: '2024-01-01T00:00:00.000Z',
        resources: [],
      },
    ];

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue(mockEnvironments);

    const result = await listEnvironments();

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    const body = JSON.parse(result.body);
    expect(body.environments).toEqual(mockEnvironments);
  });

  it('should return 500 on discovery error', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockError = new Error('AWS API Error');
    vi.mocked(resourceDiscovery.discoverEnvironments).mockRejectedValue(mockError);

    const result = await listEnvironments();

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('AWS API Error');
  });

  it('should handle non-Error exceptions', async () => {
    process.env.PROJECT_NAME = 'test-project';

    vi.mocked(resourceDiscovery.discoverEnvironments).mockRejectedValue('String error');

    const result = await listEnvironments();

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Failed to list environments');
  });

  it('should return empty array when no environments found', async () => {
    process.env.PROJECT_NAME = 'test-project';

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue([]);

    const result = await listEnvironments();

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.environments).toEqual([]);
  });
});
