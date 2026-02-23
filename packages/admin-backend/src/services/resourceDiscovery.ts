import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
} from '@aws-sdk/client-resource-groups-tagging-api';
import type { Environment, ResourceInfo } from '../types';

/**
 * Discovers all deployed environments by querying AWS Resource Groups Tagging API
 * @param projectName - Project name to filter resources
 * @returns List of environments with metadata
 */
export async function discoverEnvironments(
  projectName: string
): Promise<Environment[]> {
  const client = new ResourceGroupsTaggingAPIClient({});

  try {
    // Query all resources tagged with this project
    const response = await client.send(
      new GetResourcesCommand({
        TagFilters: [
          { Key: 'Project', Values: [projectName] },
          { Key: 'ManagedBy', Values: ['terraform'] },
        ],
      })
    );

    if (!response.ResourceTagMappingList) {
      return [];
    }

    // Filter out Mission Control resources
    const envResources = response.ResourceTagMappingList.filter((resource) => {
      const tags = resource.Tags || [];
      const isMissionControl = tags.some(
        (tag) => tag.Key === 'IsMissionControl' && tag.Value === 'true'
      );
      return !isMissionControl;
    });

    // Group resources by Environment tag
    const environmentMap = new Map<string, ResourceInfo[]>();

    for (const resource of envResources) {
      const tags = resource.Tags || [];
      const envTag = tags.find((tag) => tag.Key === 'Environment');

      if (envTag?.Value && resource.ResourceARN) {
        const envId = envTag.Value;
        const tagMap: Record<string, string> = {};

        for (const tag of tags) {
          if (tag.Key && tag.Value) {
            tagMap[tag.Key] = tag.Value;
          }
        }

        const resourceInfo: ResourceInfo = {
          arn: resource.ResourceARN,
          resourceType: extractResourceType(resource.ResourceARN),
          tags: tagMap,
        };

        if (!environmentMap.has(envId)) {
          environmentMap.set(envId, []);
        }
        environmentMap.get(envId)!.push(resourceInfo);
      }
    }

    // Build Environment objects
    const environments: Environment[] = [];

    for (const [envId, resources] of environmentMap.entries()) {
      const env = buildEnvironmentFromResources(
        envId,
        projectName,
        resources
      );
      if (env) {
        environments.push(env);
      }
    }

    // Sort by deployment date (newest first)
    environments.sort(
      (a, b) =>
        new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
    );

    return environments;
  } catch (error) {
    console.error('Error discovering environments:', error);
    throw new Error(
      `Failed to discover environments: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * Extracts resource type from ARN
 * @param arn - AWS Resource ARN
 * @returns Resource type (e.g., "cloudfront", "s3", "lambda")
 */
function extractResourceType(arn: string): string {
  // ARN format: arn:aws:service:region:account-id:resource-type/resource-id
  const parts = arn.split(':');
  if (parts.length >= 3) {
    return parts[2]; // service name
  }
  return 'unknown';
}

/**
 * Builds an Environment object from a list of resources
 * @param envId - Environment ID
 * @param projectName - Project name
 * @param resources - List of resources in this environment
 * @returns Environment object or null if incomplete
 */
function buildEnvironmentFromResources(
  envId: string,
  projectName: string,
  resources: ResourceInfo[]
): Environment | null {
  // Find CloudFront distribution
  const cloudFrontResource = resources.find(
    (r) => r.resourceType === 'cloudfront'
  );

  // Find API Gateway
  const apiGatewayResource = resources.find(
    (r) => r.resourceType === 'apigateway'
  );

  // Extract URLs from ARNs
  const frontendUrl = cloudFrontResource
    ? extractCloudFrontUrl(cloudFrontResource.arn)
    : '';
  const apiUrl = apiGatewayResource
    ? extractApiGatewayUrl(apiGatewayResource.arn)
    : '';

  // Find oldest resource creation time as deployment date
  // Note: This is approximate since resource ARNs don't contain timestamps
  // In a real system, you'd query CloudFormation stack creation time or use tags
  const deployedAt = new Date().toISOString(); // Placeholder

  return {
    environmentId: envId,
    projectName,
    frontendUrl,
    apiUrl,
    deployedAt,
    resources,
  };
}

/**
 * Extracts CloudFront URL from distribution ARN
 * @param arn - CloudFront distribution ARN
 * @returns CloudFront domain URL
 */
function extractCloudFrontUrl(arn: string): string {
  // ARN format: arn:aws:cloudfront::account-id:distribution/distribution-id
  const distributionId = arn.split('/').pop();
  // Note: We can't get the domain without an additional API call
  // For now, return a placeholder. The handler will query CloudFront API if needed.
  return distributionId ? `https://${distributionId}.cloudfront.net` : '';
}

/**
 * Extracts API Gateway URL from ARN
 * @param arn - API Gateway ARN
 * @returns API Gateway invoke URL
 */
function extractApiGatewayUrl(arn: string): string {
  // ARN format: arn:aws:apigateway:region::/restapis/api-id
  const parts = arn.split('/');
  const apiId = parts[parts.length - 1];
  const region = arn.split(':')[3];
  return `https://${apiId}.execute-api.${region}.amazonaws.com/prod`;
}
