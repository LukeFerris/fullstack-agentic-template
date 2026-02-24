import type { APIGatewayProxyResult } from 'aws-lambda';
import { getHelloMessage } from '../services/helloService';
import { createJsonResponse } from '../types';

/**
 * Handles the hello REST endpoint.
 * @param requestId - AWS Lambda request ID
 * @returns API Gateway response with hello message and request ID
 */
export function handleHello(requestId: string): APIGatewayProxyResult {
  const result = getHelloMessage();
  return createJsonResponse(200, {
    ...result,
    requestId,
  });
}
