import {
  CloudFrontClient,
  GetDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  waitUntilDistributionDeployed,
} from '@aws-sdk/client-cloudfront';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import {
  LambdaClient,
  DeleteFunctionCommand,
} from '@aws-sdk/client-lambda';
import {
  APIGatewayClient,
  DeleteRestApiCommand,
} from '@aws-sdk/client-api-gateway';
import {
  IAMClient,
  DeleteRoleCommand,
  DeleteRolePolicyCommand,
  ListRolePoliciesCommand,
  ListAttachedRolePoliciesCommand,
  DetachRolePolicyCommand,
} from '@aws-sdk/client-iam';
import {
  CloudWatchLogsClient,
  DeleteLogGroupCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  SSMClient,
  DeleteParameterCommand,
} from '@aws-sdk/client-ssm';
import type { ResourceInfo } from '../types';

/**
 * Deletes all resources for an environment in the correct dependency order
 * @param resources - List of resources to delete
 * @returns List of deleted resource ARNs
 */
export async function deleteEnvironmentResources(
  resources: ResourceInfo[]
): Promise<string[]> {
  const deletedResources: string[] = [];

  // Step 1: Disable and delete CloudFront distributions
  const cloudFrontResources = resources.filter(
    (r) => r.resourceType === 'cloudfront'
  );
  for (const resource of cloudFrontResources) {
    try {
      await deleteCloudFrontDistribution(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete CloudFront ${resource.arn}:`, error);
    }
  }

  // Step 2: Empty and delete S3 buckets
  const s3Resources = resources.filter((r) => r.resourceType === 's3');
  for (const resource of s3Resources) {
    try {
      await deleteS3Bucket(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete S3 bucket ${resource.arn}:`, error);
    }
  }

  // Step 3: Delete API Gateway REST APIs
  const apiGatewayResources = resources.filter(
    (r) => r.resourceType === 'apigateway'
  );
  for (const resource of apiGatewayResources) {
    try {
      await deleteApiGateway(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete API Gateway ${resource.arn}:`, error);
    }
  }

  // Step 4: Delete Lambda functions
  const lambdaResources = resources.filter((r) => r.resourceType === 'lambda');
  for (const resource of lambdaResources) {
    try {
      await deleteLambdaFunction(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete Lambda ${resource.arn}:`, error);
    }
  }

  // Step 5: Delete CloudWatch Log Groups
  const logsResources = resources.filter((r) => r.resourceType === 'logs');
  for (const resource of logsResources) {
    try {
      await deleteLogGroup(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete Log Group ${resource.arn}:`, error);
    }
  }

  // Step 6: Delete IAM roles
  const iamResources = resources.filter((r) => r.resourceType === 'iam');
  for (const resource of iamResources) {
    try {
      await deleteIAMRole(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete IAM role ${resource.arn}:`, error);
    }
  }

  // Step 7: Delete SSM parameters
  const ssmResources = resources.filter((r) => r.resourceType === 'ssm');
  for (const resource of ssmResources) {
    try {
      await deleteSSMParameter(resource.arn);
      deletedResources.push(resource.arn);
    } catch (error) {
      console.error(`Failed to delete SSM parameter ${resource.arn}:`, error);
    }
  }

  return deletedResources;
}

/**
 * Disables and deletes a CloudFront distribution
 * @param arn - CloudFront distribution ARN
 */
async function deleteCloudFrontDistribution(arn: string): Promise<void> {
  const client = new CloudFrontClient({});
  const distributionId = arn.split('/').pop()!;

  // Get current distribution config
  const getResponse = await client.send(
    new GetDistributionCommand({ Id: distributionId })
  );

  if (!getResponse.Distribution || !getResponse.ETag) {
    throw new Error('Distribution not found');
  }

  const config = getResponse.Distribution.DistributionConfig;
  if (!config) {
    throw new Error('Distribution config not found');
  }

  // Disable distribution if enabled
  if (config.Enabled) {
    config.Enabled = false;
    await client.send(
      new UpdateDistributionCommand({
        Id: distributionId,
        DistributionConfig: config,
        IfMatch: getResponse.ETag,
      })
    );

    // Wait for distribution to be deployed in disabled state
    await waitUntilDistributionDeployed(
      { client, maxWaitTime: 600 },
      { Id: distributionId }
    );
  }

  // Get updated ETag
  const getResponse2 = await client.send(
    new GetDistributionCommand({ Id: distributionId })
  );

  // Delete distribution
  await client.send(
    new DeleteDistributionCommand({
      Id: distributionId,
      IfMatch: getResponse2.ETag,
    })
  );
}

/**
 * Empties and deletes an S3 bucket
 * @param arn - S3 bucket ARN
 */
async function deleteS3Bucket(arn: string): Promise<void> {
  const client = new S3Client({});
  const bucketName = arn.split(':::').pop()!;

  // List and delete all objects
  let continuationToken: string | undefined;

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      })
    );

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({
              Key: obj.Key!,
            })),
          },
        })
      );
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  // Delete bucket
  await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
}

/**
 * Deletes an API Gateway REST API
 * @param arn - API Gateway ARN
 */
async function deleteApiGateway(arn: string): Promise<void> {
  const client = new APIGatewayClient({});
  const apiId = arn.split('/').pop()!;

  await client.send(new DeleteRestApiCommand({ restApiId: apiId }));
}

/**
 * Deletes a Lambda function
 * @param arn - Lambda function ARN
 */
async function deleteLambdaFunction(arn: string): Promise<void> {
  const client = new LambdaClient({});
  const functionName = arn.split(':').pop()!;

  await client.send(new DeleteFunctionCommand({ FunctionName: functionName }));
}

/**
 * Deletes a CloudWatch Log Group
 * @param arn - Log group ARN
 */
async function deleteLogGroup(arn: string): Promise<void> {
  const client = new CloudWatchLogsClient({});
  const logGroupName = arn.split(':').pop()!;

  await client.send(new DeleteLogGroupCommand({ logGroupName }));
}

/**
 * Deletes an IAM role and all attached policies
 * @param arn - IAM role ARN
 */
async function deleteIAMRole(arn: string): Promise<void> {
  const client = new IAMClient({});
  const roleName = arn.split('/').pop()!;

  // Detach managed policies
  const attachedPolicies = await client.send(
    new ListAttachedRolePoliciesCommand({ RoleName: roleName })
  );

  for (const policy of attachedPolicies.AttachedPolicies || []) {
    if (policy.PolicyArn) {
      await client.send(
        new DetachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: policy.PolicyArn,
        })
      );
    }
  }

  // Delete inline policies
  const inlinePolicies = await client.send(
    new ListRolePoliciesCommand({ RoleName: roleName })
  );

  for (const policyName of inlinePolicies.PolicyNames || []) {
    await client.send(
      new DeleteRolePolicyCommand({ RoleName: roleName, PolicyName: policyName })
    );
  }

  // Delete role
  await client.send(new DeleteRoleCommand({ RoleName: roleName }));
}

/**
 * Deletes an SSM parameter
 * @param arn - SSM parameter ARN
 */
async function deleteSSMParameter(arn: string): Promise<void> {
  const client = new SSMClient({});
  const parameterName = arn.split(':').pop()!.replace('parameter', '');

  await client.send(new DeleteParameterCommand({ Name: parameterName }));
}
