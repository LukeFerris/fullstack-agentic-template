#!/bin/bash

# Auto-deploy script for post-commit hook
# Runs terraform apply and outputs deployment URLs

# --- Resolve repo root with error handling ---

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>Failed to resolve git repository root. Not inside a git repository?</error>"
    echo "<llm-instruction>"
    echo "Deployment failed because the script could not determine the git repository root."
    echo "This likely means the script was run outside a git repository. Report this to the user."
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
}

DEPLOY_DIR="$REPO_ROOT/deployment"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>Deployment directory not found: $DEPLOY_DIR</error>"
    echo "<llm-instruction>"
    echo "Deployment failed because the deployment/ directory does not exist."
    echo "You MUST check the repository structure and ensure deployment/ exists with Terraform configs."
    echo "Only report to the user if the directory is genuinely missing."
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

APPLY_LOG=$(mktemp /tmp/deploy-apply-XXXXXX.log)
LOCK_FILE="$DEPLOY_DIR/.deploy.lock"

cleanup() {
    rm -f "$APPLY_LOG"
    rm -rf "$LOCK_FILE"
}
trap cleanup EXIT

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
    echo "Deployment failed because Terraform is not installed."
    echo "You MUST attempt to fix this yourself by running: ./scripts/install-infra-tools.sh"
    echo "Then re-run the deployment with: bash scripts/deploy/deploy.sh"
    echo "Only report to the user if the install script also fails."
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
    echo "Deployment failed because AWS CLI is not installed."
    echo "You MUST attempt to fix this yourself by running: ./scripts/install-infra-tools.sh"
    echo "Then re-run the deployment with: bash scripts/deploy/deploy.sh"
    echo "Only report to the user if the install script also fails."
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

# --- Ensure build artifacts exist ---

if [ ! -f "$REPO_ROOT/packages/backend/dist/index.js" ] || [ ! -d "$REPO_ROOT/packages/frontend/dist" ]; then
    echo "Build artifacts missing, running yarn build..."
    cd "$REPO_ROOT" || exit 1
    if ! yarn build 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>"
        echo "yarn build failed. Cannot deploy without build artifacts."
        echo "</error>"
        echo "<llm-instruction>"
        echo "Deployment failed because yarn build failed."
        echo "You MUST attempt to fix this yourself: examine the build error output above,"
        echo "identify the root cause, fix the code, and re-run the deployment with: bash scripts/deploy/deploy.sh"
        echo "Only report to the user if you cannot determine or fix the build failure."
        echo "</llm-instruction>"
        echo "</deploy-output>"
        exit 1
    fi
fi

# --- Acquire deploy lock to prevent concurrent terraform operations ---

if ! mkdir "$LOCK_FILE" 2>/dev/null; then
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>Another deployment is already in progress (lock held on $LOCK_FILE).</error>"
    echo "<llm-instruction>"
    echo "Deployment was skipped because another deployment is already running."
    echo "Report to the user that a concurrent deploy was detected and this one was skipped."
    echo "The in-progress deployment will produce the URLs when it completes."
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

# --- Terraform init (if needed) ---

cd "$DEPLOY_DIR" || exit 1

if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    if ! terraform init -input=false 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>"
        echo "terraform init failed. Check provider configuration and network connectivity."
        echo "</error>"
        echo "<llm-instruction>"
        echo "Deployment failed during terraform init."
        echo "You MUST attempt to diagnose and fix this yourself if possible:"
        echo "  - If it is a Terraform config issue, fix the .tf files and re-run: bash scripts/deploy/deploy.sh"
        echo "  - If it is a network or connectivity issue, report to the user that terraform init failed due to network problems."
        echo "  - If it is a provider version or compatibility issue, fix the provider constraints in deployment/main.tf and re-run."
        echo "Only report to the user if the issue is outside your ability to resolve."
        echo "</llm-instruction>"
        echo "</deploy-output>"
        exit 1
    fi
    echo ""
fi

# --- Terraform apply (streamed via tee) ---

echo "Applying Terraform changes..."
echo ""

terraform apply -auto-approve -input=false 2>&1 | tee "$APPLY_LOG"
APPLY_EXIT_CODE=${PIPESTATUS[0]}

if [ $APPLY_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "<deploy-output>"
    echo "<status>failed</status>"
    echo "<error>"
    cat "$APPLY_LOG"
    echo "</error>"
    echo "<llm-instruction>"
    echo "Deployment failed during terraform apply. You MUST analyze the error output above and act accordingly:"
    echo "  - If it is a CREDENTIALS or AUTHENTICATION error (e.g. 'No valid credential sources found', 'AccessDenied',"
    echo "    'ExpiredToken', 'InvalidClientTokenId'): report to the user that AWS credentials are missing or invalid"
    echo "    and they need to configure them (e.g. via aws configure, environment variables, or IAM role)."
    echo "  - If it is an IAM PERMISSIONS error (e.g. 'UnauthorizedAccess', 'is not authorized to perform'):"
    echo "    report to the user that their AWS credentials lack the required permissions and list what is needed."
    echo "  - If it is a RESOURCE CONFLICT or STATE error (e.g. 'already exists', 'ResourceConflict'):"
    echo "    attempt to fix by importing the resource or adjusting the Terraform config, then re-run: bash scripts/deploy/deploy.sh"
    echo "  - If it is a TERRAFORM CONFIG error (e.g. invalid HCL, missing variables, type mismatches):"
    echo "    fix the .tf files in the deployment/ directory and re-run: bash scripts/deploy/deploy.sh"
    echo "  - If it is a SERVICE QUOTA or LIMIT error: report to the user with the specific limit that was hit."
    echo "  - For any other error: attempt to fix it if possible, otherwise report the full error to the user."
    echo "</llm-instruction>"
    echo "</deploy-output>"
    exit 1
fi

echo ""

# --- Extract outputs ---

FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "UNAVAILABLE")
API_URL=$(terraform output -raw api_url 2>/dev/null || echo "UNAVAILABLE")
CF_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")

# --- Generate and upload config.json to S3 ---

if [ -n "$S3_BUCKET" ] && [ "$API_URL" != "UNAVAILABLE" ]; then
    echo "Uploading config.json to S3..."
    CONFIG_JSON=$(mktemp /tmp/config-XXXXXX.json)
    printf '{"apiUrl":"%s"}' "$API_URL" > "$CONFIG_JSON"
    if aws s3 cp "$CONFIG_JSON" "s3://$S3_BUCKET/config.json" \
        --content-type "application/json" \
        --cache-control "no-cache, no-store, must-revalidate" 2>&1; then
        echo "config.json uploaded successfully"
    else
        echo "WARNING: Failed to upload config.json (non-fatal)"
    fi
    rm -f "$CONFIG_JSON"
    echo ""
fi

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
