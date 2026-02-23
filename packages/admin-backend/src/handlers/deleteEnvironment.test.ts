import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deleteEnvironment } from './deleteEnvironment';
import * as resourceDiscovery from '../services/resourceDiscovery';
import * as resourceDeleter from '../services/resourceDeleter';

vi.mock('../services/resourceDiscovery');
vi.mock('../services/resourceDeleter');

describe('deleteEnvironment handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return 400 for invalid environment ID format', async () => {
    const result = await deleteEnvironment('invalid-id');

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Invalid Request');
    expect(body.message).toContain('8-character hexadecimal');
  });

  it('should accept valid 8-character hex environment ID', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockEnvironments = [
      {
        environmentId: 'abcd1234',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: '2024-01-01T00:00:00.000Z',
        resources: [
          { arn: 'arn:aws:s3:::test-bucket', resourceType: 's3', tags: {} },
        ],
      },
    ];

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue(mockEnvironments);
    vi.mocked(resourceDeleter.deleteEnvironmentResources).mockResolvedValue(['arn:aws:s3:::test-bucket']);

    const result = await deleteEnvironment('abcd1234');

    expect(result.statusCode).toBe(200);
  });

  it('should accept uppercase hex digits', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockEnvironments = [
      {
        environmentId: 'ABCD1234',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: '2024-01-01T00:00:00.000Z',
        resources: [],
      },
    ];

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue(mockEnvironments);
    vi.mocked(resourceDeleter.deleteEnvironmentResources).mockResolvedValue([]);

    const result = await deleteEnvironment('ABCD1234');

    expect(result.statusCode).toBe(200);
  });

  it('should return 500 when PROJECT_NAME not set', async () => {
    delete process.env.PROJECT_NAME;

    const result = await deleteEnvironment('abcd1234');

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Configuration Error');
  });

  it('should return 404 when environment not found', async () => {
    process.env.PROJECT_NAME = 'test-project';

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue([]);

    const result = await deleteEnvironment('abcd1234');

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Not Found');
    expect(body.message).toContain('abcd1234');
  });

  it('should delete environment successfully', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockEnvironments = [
      {
        environmentId: 'abcd1234',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: '2024-01-01T00:00:00.000Z',
        resources: [
          { arn: 'arn:aws:s3:::test-bucket', resourceType: 's3', tags: {} },
          { arn: 'arn:aws:lambda:us-east-1:123456789012:function:test', resourceType: 'lambda', tags: {} },
        ],
      },
    ];

    const mockDeletedResources = [
      'arn:aws:s3:::test-bucket',
      'arn:aws:lambda:us-east-1:123456789012:function:test',
    ];

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue(mockEnvironments);
    vi.mocked(resourceDeleter.deleteEnvironmentResources).mockResolvedValue(mockDeletedResources);

    const result = await deleteEnvironment('abcd1234');

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.environmentId).toBe('abcd1234');
    expect(body.deletedResources).toEqual(mockDeletedResources);
  });

  it('should return 500 on deletion error', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockEnvironments = [
      {
        environmentId: 'abcd1234',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: '2024-01-01T00:00:00.000Z',
        resources: [],
      },
    ];

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue(mockEnvironments);
    vi.mocked(resourceDeleter.deleteEnvironmentResources).mockRejectedValue(new Error('Deletion failed'));

    const result = await deleteEnvironment('abcd1234');

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Deletion failed');
  });

  it('should handle non-Error exceptions', async () => {
    process.env.PROJECT_NAME = 'test-project';

    const mockEnvironments = [
      {
        environmentId: 'abcd1234',
        projectName: 'test-project',
        frontendUrl: 'https://d123.cloudfront.net',
        apiUrl: 'https://api123.execute-api.us-east-1.amazonaws.com/prod',
        deployedAt: '2024-01-01T00:00:00.000Z',
        resources: [],
      },
    ];

    vi.mocked(resourceDiscovery.discoverEnvironments).mockResolvedValue(mockEnvironments);
    vi.mocked(resourceDeleter.deleteEnvironmentResources).mockRejectedValue('String error');

    const result = await deleteEnvironment('abcd1234');

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Failed to delete environment');
  });

  it('should include CORS headers in all responses', async () => {
    const result = await deleteEnvironment('invalid');

    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
  });
});
