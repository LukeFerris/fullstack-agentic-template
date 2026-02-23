import type { APIGatewayProxyResult } from 'aws-lambda';
import { discoverEnvironments } from '../services/resourceDiscovery';
import type { ListEnvironmentsResponse } from '../types';

/**
 * Handles GET /admin/environments - lists all deployed environments
 * @returns API Gateway response with environment list
 */
export async function listEnvironments(): Promise<APIGatewayProxyResult> {
  try {
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

    const environments = await discoverEnvironments(projectName);

    const response: ListEnvironmentsResponse = {
      environments,
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
    console.error('Error listing environments:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message:
          error instanceof Error ? error.message : 'Failed to list environments',
      }),
    };
  }
}
