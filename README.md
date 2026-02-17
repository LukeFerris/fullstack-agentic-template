# Fullstack TypeScript Agentic Template

A production-ready template designed for **Claude Code web** and **GitHub-powered agents** that automatically deploys your fullstack application to AWS with comprehensive security guardrails and infrastructure as code.

## 🎯 What This Template Does

This template enables AI agents (like Claude Code web) to rapidly transform a starter application into your custom fullstack app with:

- **Automated AWS Deployment**: Every commit triggers a full deployment with Terraform
- **Built-in Security**: SAST scanning, dependency checks, secret detection on every commit
- **Quality Enforcement**: ESLint, TypeScript strict mode, test coverage thresholds
- **Infrastructure as Code**: Complete AWS setup (Lambda, API Gateway, CloudFront, S3)
- **Immediate Testing**: Get deployment URLs instantly to test your changes

## 🚀 Quick Start Process

### 1. Setup Claude Code Web Environment

Configure your Claude Code web container with the required credentials as environment variables:

**Required Environment Variables:**
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- GitHub credentials (automatically injected by Claude Code web for repository access)

### 2. Use This Template

1. Click "Use this template" to create a copy in your GitHub account
2. Or fork/clone this repository to create your own version

### 3. Give It to Claude Code Web

Provide your repository to Claude Code web and describe what application you want to build:

> "Transform this template into a task management application with user authentication"

> "Build a real-time chat application with message history"

> "Create an e-commerce store with product catalog and shopping cart"

### 4. Watch the Magic Happen

The agent will:
1. Make code changes to implement your requirements
2. Run all guardrails on commit:
   - Secret detection (secretlint)
   - SAST scanning (semgrep)
   - Dependency vulnerability scanning (OSV-Scanner)
   - ESLint with security rules
   - TypeScript type checking
   - Unit tests with coverage thresholds
   - Full build verification
3. Auto-deploy to AWS with Terraform
4. Provide you with live URLs:
   - **Frontend URL**: CloudFront distribution (e.g., `https://d1234567890.cloudfront.net`)
   - **Backend API URL**: API Gateway endpoint (e.g., `https://abcdef.execute-api.us-east-1.amazonaws.com/prod`)

### 5. Iterate and Redeploy

Any further changes automatically trigger:
- All security and quality checks
- Complete redeployment to AWS
- Updated URLs (if needed)

## 📦 What's Included

### Frontend
- **React** + **TypeScript** + **Tailwind CSS**
- Vite for fast development and optimized builds
- Deployed to S3 + CloudFront for global CDN delivery

### Backend
- **AWS Lambda** functions with TypeScript
- **API Gateway** for REST endpoints
- Serverless architecture with automatic scaling

### Infrastructure
- **Terraform** for infrastructure as code
- Auto-generated unique environment IDs
- S3 + CloudFront for frontend hosting
- Lambda + API Gateway for backend APIs
- SSM Parameter Store for configuration

### Security & Quality
- **Semgrep** SAST scanning
- **OSV-Scanner** for dependency vulnerabilities
- **secretlint** for credential detection
- **ESLint** with security plugins
- TypeScript strict mode
- Vitest with coverage thresholds

## 🛡️ Guardrails

Every commit runs through comprehensive checks:

1. **Secret Detection**: Prevents credentials from being committed
2. **SAST Scanning**: Identifies security vulnerabilities in code
3. **Dependency Scanning**: Checks for vulnerable dependencies
4. **Linting**: ESLint with security, import, and code quality rules
5. **Type Checking**: TypeScript strict mode validation
6. **Build Verification**: Ensures code compiles successfully
7. **Test Coverage**: Validates unit test coverage thresholds
8. **Auto-Deploy**: Deploys to AWS on successful commit

## 🔧 Manual Commands

While the agent handles most operations, you can also run commands manually:

```bash
# Install dependencies
yarn install

# Start frontend dev server
yarn dev

# Build all packages
yarn build

# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Lint code
yarn lint

# Type check
yarn type-check

# Deploy to AWS
bash scripts/deploy/deploy.sh
```

## 📁 Project Structure

```
packages/
  frontend/           # React + Tailwind frontend
    src/
    dist/            # Build output (deployed to S3)
  backend/           # AWS Lambda functions
    src/
    dist/            # Build output (deployed to Lambda)

deployment/          # Terraform infrastructure as code
  main.tf           # Provider and environment configuration
  lambda.tf         # Lambda function resources
  api_gateway.tf    # API Gateway configuration
  s3.tf             # S3 bucket for frontend
  cloudfront.tf     # CloudFront distribution
  outputs.tf        # Deployment URLs and resource info

scripts/
  security/         # Security scanning scripts
  deploy/          # Deployment automation
  install-infra-tools.sh  # Terraform and AWS CLI setup

.husky/            # Git hooks
  pre-commit      # Runs all guardrails
  post-commit     # Triggers deployment
```

## 🔐 Security Considerations

- **Never commit AWS credentials** to the repository - inject them via environment variables
- Pre-commit hooks prevent most security issues from being committed
- SAST and SCA scanning catch vulnerabilities before deployment
- Terraform state contains sensitive information - keep it secure (not committed to git)
- CloudFront provides HTTPS by default for secure frontend access

## 🎓 How It Works

1. **Agent makes changes** to your application code
2. **Git commit triggers pre-commit hook** (via Husky)
3. **Lint-staged runs security checks** on changed files:
   - secretlint, semgrep, ESLint, build, tests, coverage
4. **Commit succeeds** if all checks pass
5. **Post-commit hook triggers deployment** (`scripts/deploy/deploy.sh`)
6. **Deployment script**:
   - Runs `yarn build` if artifacts are missing
   - Initializes Terraform (if needed)
   - Runs `terraform apply -auto-approve`
   - Uploads frontend config with API URL
   - Invalidates CloudFront cache
   - Outputs deployment URLs
7. **Agent reports URLs** to you for immediate testing

## 🚨 Troubleshooting

### Deployment Fails with AWS Credentials Error
- Ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in Claude Code web environment variables
- Verify your AWS credentials have sufficient permissions (Lambda, API Gateway, S3, CloudFront, IAM)

### Pre-commit Hooks Fail
- Review the error output - the agent will attempt to fix issues automatically
- Common issues: linting errors, test failures, coverage below threshold
- The agent cannot bypass security hooks (by design)

### Terraform State Issues
- If you need to reset: delete `deployment/terraform.tfstate` and `deployment/terraform.tfvars`
- This will create a new environment with a different environment ID

## 📝 Customization

### Changing the Project Name
Edit `deployment/terraform.tfvars` (auto-generated on first deploy):
```hcl
project_name = "my-app"
environment_id = "abc123def456"
```

### Adjusting Coverage Thresholds
Edit `vitest.config.ts` in frontend/backend packages.

### Modifying Security Rules
- SAST rules: `.semgrep/rules.yml`
- ESLint rules: `eslint.config.js`
- Secret patterns: `.secretlintrc.json`

## 🤝 Contributing

This is a template repository - fork it and make it your own! Contributions to improve the template are welcome.

## 📄 License

MIT - Use this template however you want!
