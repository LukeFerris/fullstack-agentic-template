import type { APIGatewayProxyResult } from 'aws-lambda';
import { discoverEnvironments } from '../services/resourceDiscovery';
import { deleteEnvironmentResources } from '../services/resourceDeleter';
import type { DeleteEnvironmentResponse } from '../types';

/**
 * Handles DELETE /admin/environments/{id} - deletes an environment
 * @param environmentId - Environment ID to delete
 * @returns API Gateway response with deletion status
 */
export async function deleteEnvironment(
  environmentId: string
): Promise<APIGatewayProxyResult> {
  try {
    // Validate environment ID format (8-char hex)
    if (!/^[a-f0-9]{8}$/i.test(environmentId)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid Request',
          message: 'Environment ID must be an 8-character hexadecimal string',
        }),
      };
    }

    const projectName = process.env.PROJECT_NAME;

    if (!projectName) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Configuration Error',
          message: 'PROJECT_NAME environment variable is not set',
        }),
      };
    }

    // Find the environment
    const environments = await discoverEnvironments(projectName);
    const targetEnvironment = environments.find(
      (env) => env.environmentId === environmentId
    );

    if (!targetEnvironment) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Not Found',
          message: `Environment ${environmentId} not found`,
        }),
      };
    }

    // Delete all resources
    console.log(
      `Deleting environment ${environmentId} with ${targetEnvironment.resources.length} resources`
    );

    const deletedResources = await deleteEnvironmentResources(
      targetEnvironment.resources
    );

    console.log(
      `Successfully deleted ${deletedResources.length} resources for environment ${environmentId}`
    );

    const response: DeleteEnvironmentResponse = {
      success: true,
      environmentId,
      deletedResources,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error(`Error deleting environment ${environmentId}:`, error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete environment',
      }),
    };
  }
}
