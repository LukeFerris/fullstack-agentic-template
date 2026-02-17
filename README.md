# Fullstack TypeScript Template

A modern fullstack template with React frontend and AWS Lambda backend, featuring comprehensive security tooling and code quality enforcement.

## Features

- **Frontend**: React + TypeScript + Tailwind CSS (Vite-powered)
- **Backend**: AWS Lambda TypeScript functions
- **Infrastructure**: Terraform auto-deployment on commit
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

## Pre-commit Hooks & Deployment

All commits run through:
1. Secret detection (secretlint)
2. SAST scanning (semgrep)
3. ESLint
4. TypeScript build
5. Test coverage thresholds
6. **Automatic Terraform deployment to AWS**

After all quality checks pass, the pre-commit hook automatically deploys your changes to AWS using Terraform. The deployment:
- Provisions Lambda functions, API Gateway, S3, and CloudFront
- Auto-generates environment IDs for isolated deployments
- Outputs frontend and backend URLs on success

**Prerequisites for deployment:**
- AWS credentials configured (`aws configure` or environment variables)
- Terraform and AWS CLI installed (run `./scripts/install-infra-tools.sh`)

To skip deployment during development, use `git commit --no-verify` (not recommended).

## Structure

```
packages/
  frontend/     # React + Tailwind frontend
  backend/      # AWS Lambda functions
deployment/     # Terraform infrastructure configs
scripts/
  deploy/       # Auto-deployment scripts
  security/     # Security scanning scripts
```
