import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod/v4';
import { getHelloMessage } from '../services/helloService';
import { toWebRequest, toApiGatewayResponse } from './adapter';
import { createJsonResponse } from '../types';

/**
 * Creates and configures a new MCP server with all registered tools.
 * @returns A configured McpServer instance
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'fullstack-template-api',
    version: '1.0.0',
  });

  server.registerTool(
    'hello',
    {
      title: 'Hello',
      description: 'Returns a hello message with the current timestamp',
      inputSchema: z.object({}),
    },
    async () => {
      const result = getHelloMessage();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  return server;
}

/**
 * Handles an incoming MCP protocol request via API Gateway.
 * @param event - API Gateway proxy event containing a JSON-RPC message
 * @returns API Gateway response with the JSON-RPC result
 */
export async function handleMcpRequest(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod !== 'POST') {
    return createJsonResponse(405, {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed' },
      id: null,
    });
  }

  if (!event.body) {
    return createJsonResponse(400, {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Request body is required' },
      id: null,
    });
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    const webRequest = toWebRequest(event);
    const parsedBody = JSON.parse(event.body);
    const webResponse = await transport.handleRequest(webRequest, {
      parsedBody,
    });
    return toApiGatewayResponse(webResponse);
  } finally {
    await transport.close();
    await server.close();
  }
}
