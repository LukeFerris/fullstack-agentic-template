# Fullstack TypeScript Template

A modern fullstack template with React frontend and AWS Lambda backend, featuring comprehensive security tooling and code quality enforcement.

## Features

- **Frontend**: React + TypeScript + Tailwind CSS (Vite-powered)
- **Backend**: AWS Lambda TypeScript functions
- **Security**: Semgrep SAST, OSV-Scanner SCA, secretlint
- **Quality**: ESLint, TypeScript strict mode, coverage thresholds
- **Git Hooks**: Pre-commit hooks via Husky + lint-staged

## Getting Started

```bash
# Install dependencies
yarn install

# Start frontend dev server
yarn dev

# Build all packages
yarn build

# Run tests
yarn test
```

## Pre-commit Hooks

All commits run through:
1. Secret detection (secretlint)
2. SAST scanning (semgrep)
3. ESLint
4. TypeScript build
5. Test coverage thresholds

## Structure

```
packages/
  frontend/     # React + Tailwind frontend
  backend/      # AWS Lambda functions
scripts/
  security/     # Security scanning scripts
```
