# CLAUDE.md

## Project Overview

Fullstack TypeScript Template - A starter template with React frontend and AWS Lambda backend.

## Package Structure

- `packages/frontend` - React TypeScript frontend with Tailwind CSS (Vite-powered)
- `packages/backend` - AWS Lambda TypeScript functions

## Key Commands

```bash
yarn install          # Install dependencies
yarn build            # Build all packages
yarn test             # Run tests
yarn test:coverage    # Run tests with coverage
yarn dev              # Start frontend dev server
yarn type-check       # TypeScript type checking
yarn lint             # Run ESLint
```

## Working Guidelines

1. You must generate a commit for every piece of completed work you do - ensuring the working directory is clean afterwards (no orphaned files)

## Git Commit Rules

**CRITICAL: NEVER use `--no-verify` when committing.** Pre-commit hooks exist for security and code quality. If a commit fails due to pre-commit hooks:

1. Attempt to fix the issues in the staged files
2. If the issues cannot be resolved through code modifications, **stop and explain the situation to the user**
3. Do not bypass hooks under any circumstances - they are a security requirement
4. Do not change the git hooks that are in place
5. **You are responsible for fixing ALL linting, formatting, or other issues discovered during commit checks** - even if those issues exist in files you didn't modify or are unrelated to the work done in the current session. The goal is always a clean commit.

## External Packages

- We use Yarn to manage packages
- Always use unpinned (latest) packages unless instructed

## API Development Rules

Every API endpoint must be exposed as **both** a REST endpoint and an MCP tool:

1. **Shared logic first** - Business logic lives in `packages/backend/src/services/`. Both REST handlers and MCP tools must call the same service functions. Never duplicate logic between the two.
2. **REST handler** - Add a handler in `packages/backend/src/handlers/` and wire it into `packages/backend/src/router.ts`.
3. **MCP tool** - Register a corresponding tool in `packages/backend/src/mcp/server.ts` using `server.registerTool()` with a Zod input schema.
4. **Tests for both** - Every new endpoint needs tests for the REST handler, the MCP tool invocation, and the shared service.

See `docs/mcp-rest-pattern.md` for the full guide and `packages/backend/README.md` for the backend architecture.

## Code Quality

- Never leave redundant code in the codebase - this is a greenfield project so we have no need to keep old code around
- All code must pass ESLint, security scans, and coverage thresholds before commit
