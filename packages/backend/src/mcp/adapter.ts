import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Converts an API Gateway proxy event into a Web Standard Request.
 * @param event - The API Gateway proxy event
 * @returns A Web Standard Request suitable for the MCP transport
 */
export function toWebRequest(event: APIGatewayProxyEvent): Request {
  const url = `https://lambda.local${event.path}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(event.headers || {})) {
    if (value) {
      headers.set(key, value);
    }
  }

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json, text/event-stream');
  }

  return new Request(url, {
    method: event.httpMethod,
    headers,
    body: event.body ?? undefined,
  });
}

/**
 * Converts a Web Standard Response into an API Gateway proxy result.
 * @param response - The Web Standard Response from the MCP transport
 * @returns An API Gateway proxy result
 */
export async function toApiGatewayResponse(
  response: Response,
): Promise<APIGatewayProxyResult> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
}
