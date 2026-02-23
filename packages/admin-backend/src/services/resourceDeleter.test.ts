import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEnvironmentResources } from './resourceDeleter';
import type { ResourceInfo } from '../types';

const { mockCloudFrontSend, mockS3Send, mockAPIGatewaySend, mockLambdaSend, mockLogsSend, mockIAMSend, mockSSMSend, mockWaitUntilDistributionDeployed } = vi.hoisted(() => {
  return {
    mockCloudFrontSend: vi.fn(),
    mockS3Send: vi.fn(),
    mockAPIGatewaySend: vi.fn(),
    mockLambdaSend: vi.fn(),
    mockLogsSend: vi.fn(),
    mockIAMSend: vi.fn(),
    mockSSMSend: vi.fn(),
    mockWaitUntilDistributionDeployed: vi.fn(),
  };
});

vi.mock('@aws-sdk/client-cloudfront', () => ({
  CloudFrontClient: class {
    send = mockCloudFrontSend;
  },
  GetDistributionCommand: class { constructor(public params: any) {} },
  UpdateDistributionCommand: class { constructor(public params: any) {} },
  DeleteDistributionCommand: class { constructor(public params: any) {} },
  waitUntilDistributionDeployed: mockWaitUntilDistributionDeployed,
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockS3Send;
  },
  ListObjectsV2Command: class { constructor(public params: any) {} },
  DeleteObjectsCommand: class { constructor(public params: any) {} },
  DeleteBucketCommand: class { constructor(public params: any) {} },
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class {
    send = mockLambdaSend;
  },
  DeleteFunctionCommand: class { constructor(public params: any) {} },
}));

vi.mock('@aws-sdk/client-api-gateway', () => ({
  APIGatewayClient: class {
    send = mockAPIGatewaySend;
  },
  DeleteRestApiCommand: class { constructor(public params: any) {} },
}));

vi.mock('@aws-sdk/client-iam', () => ({
  IAMClient: class {
    send = mockIAMSend;
  },
  DeleteRoleCommand: class { constructor(public params: any) {} },
  DeleteRolePolicyCommand: class { constructor(public params: any) {} },
  ListRolePoliciesCommand: class { constructor(public params: any) {} },
  ListAttachedRolePoliciesCommand: class { constructor(public params: any) {} },
  DetachRolePolicyCommand: class { constructor(public params: any) {} },
}));

vi.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: class {
    send = mockLogsSend;
  },
  DeleteLogGroupCommand: class { constructor(public params: any) {} },
}));

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class {
    send = mockSSMSend;
  },
  DeleteParameterCommand: class { constructor(public params: any) {} },
}));

describe('resourceDeleter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitUntilDistributionDeployed.mockResolvedValue({});
  });

  describe('deleteEnvironmentResources', () => {
    it('should delete all resources in correct order', async () => {
      const resources: ResourceInfo[] = [
        { arn: 'arn:aws:cloudfront::123456789012:distribution/ABC123', resourceType: 'cloudfront', tags: {} },
        { arn: 'arn:aws:s3:::test-bucket', resourceType: 's3', tags: {} },
        { arn: 'arn:aws:apigateway:us-east-1::/restapis/xyz789', resourceType: 'apigateway', tags: {} },
        { arn: 'arn:aws:lambda:us-east-1:123456789012:function:test-fn', resourceType: 'lambda', tags: {} },
        { arn: 'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/test', resourceType: 'logs', tags: {} },
        { arn: 'arn:aws:iam::123456789012:role/test-role', resourceType: 'iam', tags: {} },
        { arn: 'arn:aws:ssm:us-east-1:123456789012:parameter/test-param', resourceType: 'ssm', tags: {} },
      ];

      // Mock CloudFront
      mockCloudFrontSend
        .mockResolvedValueOnce({
          Distribution: { DistributionConfig: { Enabled: true } },
          ETag: 'etag1',
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ ETag: 'etag2' })
        .mockResolvedValueOnce({});

      // Mock S3
      mockS3Send
        .mockResolvedValueOnce({ Contents: [{ Key: 'file1.txt' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      // Mock API Gateway
      mockAPIGatewaySend.mockResolvedValue({});

      // Mock Lambda
      mockLambdaSend.mockResolvedValue({});

      // Mock CloudWatch Logs
      mockLogsSend.mockResolvedValue({});

      // Mock IAM
      mockIAMSend
        .mockResolvedValueOnce({ AttachedPolicies: [{ PolicyArn: 'arn:aws:iam::123456789012:policy/test-policy' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ PolicyNames: ['inline-policy'] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      // Mock SSM
      mockSSMSend.mockResolvedValue({});

      const result = await deleteEnvironmentResources(resources);

      expect(result).toHaveLength(7);
      expect(result).toContain(resources[0].arn);
    });

    it('should handle empty resource list', async () => {
      const result = await deleteEnvironmentResources([]);

      expect(result).toEqual([]);
    });

    it('should continue on partial failures', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const resources: ResourceInfo[] = [
        { arn: 'arn:aws:cloudfront::123456789012:distribution/ABC123', resourceType: 'cloudfront', tags: {} },
        { arn: 'arn:aws:s3:::test-bucket', resourceType: 's3', tags: {} },
      ];

      mockCloudFrontSend.mockRejectedValue(new Error('CloudFront deletion failed'));
      mockS3Send
        .mockResolvedValueOnce({ Contents: [] })
        .mockResolvedValueOnce({});

      const result = await deleteEnvironmentResources(resources);

      expect(result).toHaveLength(1);
      expect(result).toContain(resources[1].arn);
      consoleError.mockRestore();
    });

    it('should handle CloudFront already disabled', async () => {
      const resources: ResourceInfo[] = [
        { arn: 'arn:aws:cloudfront::123456789012:distribution/ABC123', resourceType: 'cloudfront', tags: {} },
      ];

      mockCloudFrontSend
        .mockResolvedValueOnce({
          Distribution: { DistributionConfig: { Enabled: false } },
          ETag: 'etag1',
        })
        .mockResolvedValueOnce({ ETag: 'etag2' })
        .mockResolvedValueOnce({});

      const result = await deleteEnvironmentResources(resources);

      expect(result).toHaveLength(1);
      expect(mockCloudFrontSend).toHaveBeenCalledTimes(3);
    });

    it('should handle S3 bucket with multiple pages of objects', async () => {
      const resources: ResourceInfo[] = [
        { arn: 'arn:aws:s3:::test-bucket', resourceType: 's3', tags: {} },
      ];

      mockS3Send
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file1.txt' }, { Key: 'file2.txt' }],
          NextContinuationToken: 'token123',
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Contents: [{ Key: 'file3.txt' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await deleteEnvironmentResources(resources);

      expect(result).toHaveLength(1);
      expect(mockS3Send).toHaveBeenCalledTimes(5);
    });

    it('should handle IAM role without policies', async () => {
      const resources: ResourceInfo[] = [
        { arn: 'arn:aws:iam::123456789012:role/test-role', resourceType: 'iam', tags: {} },
      ];

      mockIAMSend
        .mockResolvedValueOnce({ AttachedPolicies: [] })
        .mockResolvedValueOnce({ PolicyNames: [] })
        .mockResolvedValueOnce({});

      const result = await deleteEnvironmentResources(resources);

      expect(result).toHaveLength(1);
      expect(mockIAMSend).toHaveBeenCalledTimes(3);
    });
  });
});
