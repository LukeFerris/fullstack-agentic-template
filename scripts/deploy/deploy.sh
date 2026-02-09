#!/bin/bash

# Auto-deploy script for post-commit hook
# Runs terraform apply and outputs deployment URLs

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEPLOY_DIR="$REPO_ROOT/deployment"

echo ""
echo "========================================="
echo "  Auto-Deploy: Starting deployment..."
echo "========================================="
echo ""

# --- Preflight checks ---

if ! command -v terraform &> /dev/null; then
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>"
    echo "Terraform is not installed. Run ./scripts/install-infra-tools.sh first."
    echo "</error>"
    echo "<llm-instruction>"
    echo "Report to the user that the deployment failed because Terraform is not installed."
    echo "Suggest running: ./scripts/install-infra-tools.sh"
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>"
    echo "AWS CLI is not installed. Run ./scripts/install-infra-tools.sh first."
    echo "</error>"
    echo "<llm-instruction>"
    echo "Report to the user that the deployment failed because AWS CLI is not installed."
    echo "Suggest running: ./scripts/install-infra-tools.sh"
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

# --- Ensure build artifacts exist ---

if [ ! -f "$REPO_ROOT/packages/backend/dist/index.js" ] || [ ! -d "$REPO_ROOT/packages/frontend/dist" ]; then
    echo "Build artifacts missing, running yarn build..."
    cd "$REPO_ROOT"
    if ! yarn build 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>"
        echo "yarn build failed. Cannot deploy without build artifacts."
        echo "</error>"
        echo "<llm-instruction>"
        echo "Report to the user that the deployment failed because the build step failed."
        echo "Include the build error output above so they can diagnose the issue."
        echo "</llm-instruction>"
        echo "</deploy-output>"
        exit 1
    fi
fi

# --- Terraform init (if needed) ---

cd "$DEPLOY_DIR"

if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    if ! terraform init -input=false 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>"
        echo "terraform init failed. Check provider configuration and network connectivity."
        echo "</error>"
        echo "<llm-instruction>"
        echo "Report to the user that the deployment failed during Terraform initialization."
        echo "Include the full error output above so they can diagnose the issue."
        echo "</llm-instruction>"
        echo "</deploy-output>"
        exit 1
    fi
    echo ""
fi

# --- Terraform apply ---

echo "Applying Terraform changes..."
echo ""

APPLY_OUTPUT=$(terraform apply -auto-approve -input=false 2>&1)
APPLY_EXIT_CODE=$?

if [ $APPLY_EXIT_CODE -ne 0 ]; then
    echo "$APPLY_OUTPUT"
    echo ""
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>"
    echo "$APPLY_OUTPUT"
    echo "</error>"
    echo "<llm-instruction>"
    echo "Report to the user that the deployment failed during terraform apply."
    echo "Include the FULL error output above so they can diagnose the issue."
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

echo "$APPLY_OUTPUT"
echo ""

# --- Extract outputs ---

FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "UNAVAILABLE")
API_URL=$(terraform output -raw api_url 2>/dev/null || echo "UNAVAILABLE")
CF_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

# --- CloudFront cache invalidation ---

if [ -n "$CF_DISTRIBUTION_ID" ] && [ "$CF_DISTRIBUTION_ID" != "UNAVAILABLE" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$CF_DISTRIBUTION_ID" \
        --paths "/*" 2>&1 || echo "WARNING: CloudFront cache invalidation failed (non-fatal)."
    echo ""
fi

# --- Output results with LLM instruction ---

echo "========================================="
echo "  Deployment Successful!"
echo "========================================="
echo ""
echo "  Frontend URL: $FRONTEND_URL"
echo "  Backend API URL: $API_URL"
echo ""
echo "<deploy-output>"
echo "<status>success</status>"
echo "<frontend-url>$FRONTEND_URL</frontend-url>"
echo "<api-url>$API_URL</api-url>"
echo "<llm-instruction>"
echo "IMPORTANT: You MUST include these deployment URLs in your response to the user."
echo "Report that the deployment was successful and provide:"
echo "  - Frontend URL: $FRONTEND_URL"
echo "  - Backend API URL: $API_URL"
echo "</llm-instruction>"
echo "</deploy-output>"
