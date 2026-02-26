import {
  ResourceGroupsTaggingAPIClient,
  GetResourcesCommand,
} from '@aws-sdk/client-resource-groups-tagging-api';
import {
  CloudFrontClient,
  GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';
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
      const env = await buildEnvironmentFromResources(
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
async function buildEnvironmentFromResources(
  envId: string,
  projectName: string,
  resources: ResourceInfo[]
): Promise<Environment | null> {
  // Find CloudFront distribution (not a stage or other sub-resource)
  const cloudFrontResource = resources.find(
    (r) => r.resourceType === 'cloudfront'
  );

  // Find API Gateway REST API (exclude stage ARNs like .../restapis/id/stages/prod)
  const apiGatewayResource = resources.find(
    (r) =>
      r.resourceType === 'apigateway' &&
      /\/restapis\/[^/]+$/.test(r.arn)
  );

  // Resolve CloudFront domain via API
  const frontendUrl = cloudFrontResource
    ? await resolveCloudFrontDomain(cloudFrontResource.arn)
    : '';
  const apiUrl = apiGatewayResource
    ? extractApiGatewayUrl(apiGatewayResource.arn)
    : '';

  const deployedAt = new Date().toISOString();

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
 * Resolves the actual CloudFront domain name by calling the CloudFront API
 * @param arn - CloudFront distribution ARN
 * @returns CloudFront domain URL (e.g., https://d1234abcde.cloudfront.net)
 */
async function resolveCloudFrontDomain(arn: string): Promise<string> {
  const distributionId = arn.split('/').pop();
  if (!distributionId) {
    return '';
  }

  try {
    const client = new CloudFrontClient({});
    const response = await client.send(
      new GetDistributionCommand({ Id: distributionId })
    );
    const domainName = response.Distribution?.DomainName;
    return domainName ? `https://${domainName}` : '';
  } catch (error) {
    console.warn(
      `Failed to resolve CloudFront domain for ${distributionId}:`,
      error
    );
    return '';
  }
}

/**
 * Extracts API Gateway URL from ARN
 * @param arn - API Gateway ARN (e.g., arn:aws:apigateway:region::/restapis/api-id)
 * @returns API Gateway invoke URL
 */
function extractApiGatewayUrl(arn: string): string {
  const match = arn.match(/\/restapis\/([^/]+)$/);
  if (!match) {
    return '';
  }
  const apiId = match[1];
  const region = arn.split(':')[3];
  return `https://${apiId}.execute-api.${region}.amazonaws.com/prod`;
}
