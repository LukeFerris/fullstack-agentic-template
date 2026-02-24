# Backend

AWS Lambda function serving both a REST API and an MCP (Model Context Protocol) server from the same handler.

## Architecture

```
API Gateway (ANY /{proxy+})
        |
   Lambda Handler (index.ts)
        |
   ┌────┴────┐
   |         |
 /mcp    all other paths
   |         |
MCP Server   REST Router
   |         |
   └────┬────┘
        |
  Shared Services
```

Every endpoint is exposed as both a REST route and an MCP tool, sharing the same service-layer business logic. See [docs/mcp-rest-pattern.md](../../docs/mcp-rest-pattern.md) for the full guide on adding new endpoints.

## Endpoints

### REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Hello message (backward compat) |
| GET | `/api/hello` | Hello message with timestamp and request ID |
| OPTIONS | `*` | CORS preflight |

### MCP Tools

| Tool | Description |
|------|-------------|
| `hello` | Returns a hello message with the current timestamp |

MCP endpoint: `POST /mcp` (JSON-RPC 2.0, stateless StreamableHTTP)

## File Structure

```
src/
  index.ts              # Lambda entry point, routes /mcp vs REST
  router.ts             # REST API path routing
  types.ts              # Shared response helpers, CORS headers
  handlers/
    hello.ts            # REST handler for hello endpoint
  services/
    helloService.ts     # Shared business logic
  mcp/
    server.ts           # MCP server setup + tool registration
    adapter.ts          # API Gateway <-> Web Standard Request/Response
```

## Build

```bash
yarn workspace backend build       # Bundle with esbuild -> dist/index.js
yarn workspace backend type-check  # TypeScript type checking (no emit)
```

Uses **esbuild** to bundle all dependencies into a single `dist/index.js` file. The Terraform deployment zips this single file for Lambda.

## Key Dependencies

- `@modelcontextprotocol/sdk` - MCP server and StreamableHTTP transport
- `zod` - Input schema validation for MCP tools (uses `zod/v4`)
