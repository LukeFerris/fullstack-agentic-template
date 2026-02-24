# MCP + REST Dual-Endpoint Pattern

The backend Lambda serves every API endpoint as both a REST endpoint (for the frontend) and an MCP tool (for AI assistants). Both share the same business logic through a service layer.

## Architecture

```
POST /mcp  ──→  MCP Server  ──→  Service Layer  ←──  REST Handler  ←──  GET /api/hello
                (tools/call)      (shared logic)      (JSON response)
```

## How to Add a New Endpoint

### 1. Create the Service

Add your business logic to `packages/backend/src/services/`. Services are pure functions with no knowledge of HTTP or MCP.

```typescript
// packages/backend/src/services/weatherService.ts
export interface WeatherResult {
  location: string;
  temperature: number;
}

export function getWeather(location: string): WeatherResult {
  return { location, temperature: 22 };
}
```

### 2. Create the REST Handler

Add a handler in `packages/backend/src/handlers/` that calls the service and returns an `APIGatewayProxyResult`.

```typescript
// packages/backend/src/handlers/weather.ts
import { getWeather } from '../services/weatherService';
import { createJsonResponse } from '../types';

export function handleWeather(location: string): APIGatewayProxyResult {
  return createJsonResponse(200, getWeather(location));
}
```

### 3. Register the Route

Add the path to `packages/backend/src/router.ts`:

```typescript
if (path === '/api/weather' && httpMethod === 'GET') {
  const location = event.queryStringParameters?.location ?? 'London';
  return handleWeather(location);
}
```

### 4. Register the MCP Tool

Add the tool in `packages/backend/src/mcp/server.ts` inside `createMcpServer()`:

```typescript
import { getWeather } from '../services/weatherService';

server.registerTool(
  'get-weather',
  {
    title: 'Get Weather',
    description: 'Returns the current weather for a location',
    inputSchema: z.object({
      location: z.string().describe('City name'),
    }),
  },
  async ({ location }) => {
    const result = getWeather(location);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  },
);
```

### 5. Write Tests

You need three test files:

- `services/weatherService.test.ts` - Unit tests for the pure service function
- `handlers/weather.test.ts` - Tests for REST response formatting
- `mcp/server.test.ts` - Add a test case for the new tool via `tools/call`

## MCP Protocol Details

- **Transport**: WebStandard StreamableHTTP (stateless mode)
- **Endpoint**: `POST /mcp` accepts JSON-RPC 2.0 messages
- **Stateless**: Each request creates a fresh server+transport instance. No session management.
- **No initialization required**: In stateless mode, clients can call `tools/list` or `tools/call` directly without sending `initialize` first.

### Key JSON-RPC Methods

| Method | Purpose |
|--------|---------|
| `initialize` | Handshake, returns server capabilities |
| `tools/list` | Lists all available tools and their schemas |
| `tools/call` | Executes a tool by name with arguments |

### Example: Calling a Tool

```bash
curl -X POST https://your-api.com/prod/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hello","arguments":{}}}'
```

## File Structure

```
packages/backend/src/
  index.ts              # Lambda entry: routes /mcp vs REST
  router.ts             # REST path routing
  types.ts              # Shared response helpers, CORS headers
  handlers/             # REST endpoint handlers
    hello.ts
  services/             # Shared business logic (pure functions)
    helloService.ts
  mcp/
    server.ts           # MCP server setup + tool registration
    adapter.ts          # API Gateway <-> Web Standard Request/Response
```

## Build

The backend uses **esbuild** to bundle all dependencies (MCP SDK, Zod) into a single `dist/index.js`. The Terraform deployment zips this single file -- no changes needed to infrastructure when adding new tools.
