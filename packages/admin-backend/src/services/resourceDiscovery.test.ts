import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverEnvironments } from './resourceDiscovery';

const { mockSend, mockCfSend } = vi.hoisted(() => {
  return {
    mockSend: vi.fn(),
    mockCfSend: vi.fn(),
  };
});

vi.mock('@aws-sdk/client-resource-groups-tagging-api', () => {
  return {
    ResourceGroupsTaggingAPIClient: class {
      send = mockSend;
    },
    GetResourcesCommand: class {
      constructor(public params: any) {}
    },
  };
});

vi.mock('@aws-sdk/client-cloudfront', () => {
  return {
    CloudFrontClient: class {
      send = mockCfSend;
    },
    GetDistributionCommand: class {
      constructor(public params: any) {}
    },
  };
});

describe('resourceDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCfSend.mockResolvedValue({
      Distribution: { DomainName: 'd1234abcde.cloudfront.net' },
    });
  });

  describe('discoverEnvironments', () => {
    it('should discover and group environments correctly', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:cloudfront::123456789012:distribution/ABC123',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
          {
            ResourceARN: 'arn:aws:s3:::test-bucket',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
          {
            ResourceARN: 'arn:aws:apigateway:us-east-1::/restapis/xyz789',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env67890' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result).toHaveLength(2);
      const env12345 = result.find(e => e.environmentId === 'env12345');
      const env67890 = result.find(e => e.environmentId === 'env67890');
      expect(env12345).toBeDefined();
      expect(env67890).toBeDefined();
      expect(env12345!.resources).toHaveLength(2);
      expect(env12345!.frontendUrl).toBe('https://d1234abcde.cloudfront.net');
    });

    it('should resolve CloudFront domain via API', async () => {
      mockCfSend.mockResolvedValue({
        Distribution: { DomainName: 'dabcxyz.cloudfront.net' },
      });
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:cloudfront::123456789012:distribution/EO72LSS9WO5QV',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result[0].frontendUrl).toBe('https://dabcxyz.cloudfront.net');
      expect(mockCfSend).toHaveBeenCalledOnce();
    });

    it('should return empty frontendUrl when CloudFront API fails', async () => {
      mockCfSend.mockRejectedValue(new Error('Access denied'));
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:cloudfront::123456789012:distribution/ABC123',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result[0].frontendUrl).toBe('');
    });

    it('should filter out Mission Control resources', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:cloudfront::123456789012:distribution/MISSION',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'IsMissionControl', Value: 'true' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
          {
            ResourceARN: 'arn:aws:s3:::env-bucket',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result).toHaveLength(1);
      expect(result[0].environmentId).toBe('env12345');
    });

    it('should handle empty resource list', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [],
      });

      const result = await discoverEnvironments('test-project');

      expect(result).toEqual([]);
    });

    it('should handle undefined ResourceTagMappingList', async () => {
      mockSend.mockResolvedValue({});

      const result = await discoverEnvironments('test-project');

      expect(result).toEqual([]);
    });

    it('should skip resources without Environment tag', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:s3:::no-env-bucket',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result).toEqual([]);
    });

    it('should extract API Gateway URL correctly from REST API ARN', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:apigateway:us-west-2::/restapis/abc123xyz',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'testenv' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result[0].apiUrl).toBe('https://abc123xyz.execute-api.us-west-2.amazonaws.com/prod');
    });

    it('should use REST API ARN not stage ARN for API Gateway URL', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:apigateway:us-east-1::/restapis/abc123xyz/stages/prod',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'testenv' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
          {
            ResourceARN: 'arn:aws:apigateway:us-east-1::/restapis/abc123xyz',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'testenv' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result[0].apiUrl).toBe('https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod');
    });

    it('should throw error on API failure', async () => {
      const mockError = new Error('AWS API Error');
      mockSend.mockRejectedValue(mockError);

      await expect(discoverEnvironments('test-project')).rejects.toThrow('Failed to discover environments');
    });

    it('should handle resources with missing tags gracefully', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:s3:::test-bucket',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
              { Key: null, Value: 'invalid' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result).toHaveLength(1);
      expect(result[0].resources[0].tags).not.toHaveProperty('null');
    });

    it('should skip resources without ARN', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: null,
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'env12345' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result).toEqual([]);
    });

    it('should extract resource type from ARN correctly', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'testenv' },
              { Key: 'ManagedBy', Value: 'terraform' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result[0].resources[0].resourceType).toBe('lambda');
    });

    it('should handle malformed ARN gracefully', async () => {
      mockSend.mockResolvedValue({
        ResourceTagMappingList: [
          {
            ResourceARN: 'invalid-arn',
            Tags: [
              { Key: 'Project', Value: 'test-project' },
              { Key: 'Environment', Value: 'testenv' },
            ],
          },
        ],
      });

      const result = await discoverEnvironments('test-project');

      expect(result[0].resources[0].resourceType).toBe('unknown');
    });
  });
});
