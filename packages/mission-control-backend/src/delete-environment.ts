import type { ApiResponse } from './types';
import { jsonResponse } from './response';
import { cleanupS3Buckets } from './cleanup-s3';
import { disableCloudFrontDistributions, deleteCloudFrontOACs } from './cleanup-cloudfront';
import { deleteLambdaFunction, deleteApiGateway, deleteLogGroup } from './cleanup-compute';
import { deleteIamRole, deleteIamPolicy } from './cleanup-iam';
import { deleteEnvironmentSsmParams, deleteRegistryEntry } from './cleanup-ssm';

/**
 * Handles DELETE /api/environments/:id - removes all AWS resources for an environment.
 * @param resourcePrefix - The resource prefix identifying the environment
 * @returns API response confirming deletion
 */
export async function deleteEnvironment(resourcePrefix: string): Promise<ApiResponse> {
  if (!resourcePrefix || resourcePrefix.includes('..') || resourcePrefix.includes('/')) {
    return jsonResponse(400, { error: 'Invalid resource prefix' });
  }

  await disableCloudFrontDistributions(resourcePrefix);
  await cleanupS3Buckets(resourcePrefix);
  await deleteApiGateway(resourcePrefix);
  await deleteLambdaFunction(resourcePrefix);
  await deleteLogGroup(resourcePrefix);
  await deleteIamRole(resourcePrefix);
  await deleteIamPolicy(resourcePrefix);
  await deleteEnvironmentSsmParams(resourcePrefix);
  await deleteCloudFrontOACs(resourcePrefix);
  await deleteRegistryEntry(resourcePrefix);

  return jsonResponse(200, { message: `Environment ${resourcePrefix} deleted` });
}
