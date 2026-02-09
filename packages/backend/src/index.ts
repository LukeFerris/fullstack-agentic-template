import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

/**
 * Response body structure for the hello endpoint.
 */
interface HelloResponse {
  message: string;
  timestamp: string;
  requestId: string;
}

/**
 * Creates a successful API Gateway response.
 * @param body - The response body object
 * @returns Formatted API Gateway response
 */
function createResponse(body: HelloResponse): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

/**
 * AWS Lambda handler for the hello world endpoint.
 * @param _event - API Gateway proxy event (unused)
 * @param context - Lambda context object
 * @returns API Gateway proxy result with hello message
 */
export async function handler(
  _event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const response: HelloResponse = {
    message: 'Hello universe',
    timestamp: new Date().toISOString(),
    requestId: context.awsRequestId,
  };

  return createResponse(response);
}
