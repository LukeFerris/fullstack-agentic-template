import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cleanup-s3', () => ({ cleanupS3Buckets: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./cleanup-cloudfront', () => ({
  disableCloudFrontDistributions: vi.fn().mockResolvedValue(undefined),
  deleteCloudFrontOACs: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./cleanup-compute', () => ({
  deleteLambdaFunction: vi.fn().mockResolvedValue(undefined),
  deleteApiGateway: vi.fn().mockResolvedValue(undefined),
  deleteLogGroup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./cleanup-iam', () => ({
  deleteIamRole: vi.fn().mockResolvedValue(undefined),
  deleteIamPolicy: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./cleanup-ssm', () => ({
  deleteEnvironmentSsmParams: vi.fn().mockResolvedValue(undefined),
  deleteRegistryEntry: vi.fn().mockResolvedValue(undefined),
}));

import { deleteEnvironment } from './delete-environment';
import { cleanupS3Buckets } from './cleanup-s3';
import { disableCloudFrontDistributions } from './cleanup-cloudfront';
import { deleteLambdaFunction, deleteApiGateway } from './cleanup-compute';
import { deleteIamRole } from './cleanup-iam';
import { deleteRegistryEntry } from './cleanup-ssm';

beforeEach(() => vi.clearAllMocks());

describe('deleteEnvironment', () => {
  it('returns 400 for empty resource prefix', async () => {
    const result = await deleteEnvironment('');
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 for prefix with path traversal', async () => {
    const result = await deleteEnvironment('../etc');
    expect(result.statusCode).toBe(400);
  });

  it('calls all cleanup functions for valid prefix', async () => {
    const result = await deleteEnvironment('proj-abc123');

    expect(result.statusCode).toBe(200);
    expect(disableCloudFrontDistributions).toHaveBeenCalledWith('proj-abc123');
    expect(cleanupS3Buckets).toHaveBeenCalledWith('proj-abc123');
    expect(deleteApiGateway).toHaveBeenCalledWith('proj-abc123');
    expect(deleteLambdaFunction).toHaveBeenCalledWith('proj-abc123');
    expect(deleteIamRole).toHaveBeenCalledWith('proj-abc123');
    expect(deleteRegistryEntry).toHaveBeenCalledWith('proj-abc123');
  });

  it('returns success message in body', async () => {
    const result = await deleteEnvironment('proj-abc123');
    const body = JSON.parse(result.body);
    expect(body.message).toContain('proj-abc123');
  });
});
