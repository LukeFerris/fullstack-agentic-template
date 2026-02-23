import type {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * Lambda authorizer for Mission Control API
 * Validates Cognito JWT tokens from Authorization header
 * @param event - API Gateway authorizer event
 * @returns IAM policy allowing or denying access
 */
export async function handler(
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  console.log('Authorizer invoked for:', event.methodArn);

  try {
    // Extract token from Authorization header
    const authorizationHeader =
      event.headers?.Authorization || event.headers?.authorization;

    if (!authorizationHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authorizationHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new Error('Invalid Authorization header format');
    }

    // Verify JWT token
    const userPoolId = process.env.USER_POOL_ID;
    const clientId = process.env.CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error('USER_POOL_ID or CLIENT_ID environment variables not set');
    }

    const verifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: 'id',
    });

    const payload = await verifier.verify(token);

    console.log('Token verified for user:', payload.sub);

    // Generate allow policy
    return generatePolicy(payload.sub, 'Allow', event.methodArn);
  } catch (error) {
    console.error('Authorization failed:', error);

    // Return deny policy on any error
    return generatePolicy('unknown', 'Deny', event.methodArn);
  }
}

/**
 * Generates an IAM policy for API Gateway
 * @param principalId - User identifier
 * @param effect - Allow or Deny
 * @param resource - API Gateway method ARN
 * @returns IAM policy document
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
