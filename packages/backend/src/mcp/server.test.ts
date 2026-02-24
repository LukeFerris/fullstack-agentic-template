import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handleMcpRequest, createMcpServer } from './server';

describe('createMcpServer', () => {
  it('should return an McpServer instance', () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });
});

/**
 * Creates a POST /mcp event for testing.
 * @param body - JSON-RPC request body
 * @returns API Gateway event for the MCP endpoint
 */
function createMcpEvent(body: unknown): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/mcp',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } as APIGatewayProxyEvent;
}

describe('handleMcpRequest - validation', () => {
  it('should return 405 for non-POST requests', async () => {
    const event = {
      httpMethod: 'GET',
      path: '/mcp',
      headers: {},
    } as APIGatewayProxyEvent;

    const response = await handleMcpRequest(event);
    expect(response.statusCode).toBe(405);
    const body = JSON.parse(response.body);
    expect(body.error.message).toBe('Method not allowed');
  });

  it('should return 400 for missing body', async () => {
    const event = {
      httpMethod: 'POST',
      path: '/mcp',
      headers: {},
      body: null,
    } as APIGatewayProxyEvent;

    const response = await handleMcpRequest(event);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.message).toBe('Request body is required');
  });
});

describe('handleMcpRequest - initialize', () => {
  it('should handle MCP initialize request', async () => {
    const event = createMcpEvent({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    const response = await handleMcpRequest(event);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.result.serverInfo.name).toBe('fullstack-template-api');
  });
});

describe('handleMcpRequest - tools', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should list the hello tool via tools/list', async () => {
    const event = createMcpEvent({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });

    const response = await handleMcpRequest(event);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const helloTool = body.result.tools.find(
      (t: { name: string }) => t.name === 'hello',
    );
    expect(helloTool).toBeDefined();
    expect(helloTool.description).toContain('hello message');
  });

  it('should execute the hello tool via tools/call', async () => {
    const event = createMcpEvent({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'hello', arguments: {} },
    });

    const response = await handleMcpRequest(event);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    const textContent = body.result.content[0];
    expect(textContent.type).toBe('text');
    const parsed = JSON.parse(textContent.text);
    expect(parsed.message).toBe('Hello universe');
    expect(parsed.timestamp).toBe('2025-06-15T12:00:00.000Z');
  });
});
