import { LambdaClient, DeleteFunctionCommand } from '@aws-sdk/client-lambda';
import { APIGatewayClient, DeleteRestApiCommand, GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import { CloudWatchLogsClient, DeleteLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';

const lambda = new LambdaClient({});
const apiGw = new APIGatewayClient({});
const logs = new CloudWatchLogsClient({});

/**
 * Deletes the Lambda function for the environment.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteLambdaFunction(resourcePrefix: string): Promise<void> {
  const functionName = `${resourcePrefix}-api`;
  try {
    await lambda.send(new DeleteFunctionCommand({ FunctionName: functionName }));
  } catch (err: unknown) {
    if (!isNotFoundError(err)) throw err;
  }
}

/**
 * Deletes the API Gateway REST API for the environment.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteApiGateway(resourcePrefix: string): Promise<void> {
  const apiName = `${resourcePrefix}-api`;
  const { items } = await apiGw.send(new GetRestApisCommand({}));
  const matching = (items ?? []).filter((api) => api.name === apiName);

  for (const api of matching) {
    await apiGw.send(new DeleteRestApiCommand({ restApiId: api.id! }));
  }
}

/**
 * Deletes the CloudWatch log group for the environment.
 * @param resourcePrefix - The environment resource prefix
 */
export async function deleteLogGroup(resourcePrefix: string): Promise<void> {
  const logGroupName = `/aws/lambda/${resourcePrefix}-api`;
  try {
    await logs.send(new DeleteLogGroupCommand({ logGroupName }));
  } catch (err: unknown) {
    if (!isNotFoundError(err)) throw err;
  }
}

/**
 * Checks if an error is a not-found error from AWS.
 * @param err - The error to check
 * @returns True if the error indicates the resource was not found
 */
function isNotFoundError(err: unknown): boolean {
  const code = (err as { name?: string }).name ?? '';
  return code === 'ResourceNotFoundException' || code === 'NotFoundException';
}
