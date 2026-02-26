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

if [ ! -f "$REPO_ROOT/packages/backend/dist/index.js" ] || [ ! -d "$REPO_ROOT/packages/frontend/dist" ] || [ ! -d "$REPO_ROOT/packages/mission-control-frontend/dist" ]; then
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

# --- Mission Control Deployment ---

MC_STATE_FILE="$REPO_ROOT/deployment/mission-control/mission-control.tfstate"
MC_URL=""

if [ ! -f "$MC_STATE_FILE" ]; then
    echo ""
    echo "========================================="
    echo "  Mission Control: First Deployment"
    echo "========================================="
    echo ""

    # Get project name from main deployment (or derive it)
    if [ -f "$DEPLOY_DIR/terraform.tfvars" ]; then
        PROJECT_NAME=$(grep 'project_name' "$DEPLOY_DIR/terraform.tfvars" 2>/dev/null | cut -d '"' -f2)
    fi

    if [ -z "$PROJECT_NAME" ]; then
        # Auto-derive from repo directory
        PROJECT_NAME=$(basename "$REPO_ROOT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | cut -c1-12 | sed 's/^-\|−$//')
    fi

    # Build admin backend and mission control frontend
    echo "Building admin backend and mission control frontend..."
    cd "$REPO_ROOT" || exit 1
    if ! yarn workspace admin-backend build 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>Failed to build admin backend</error>"
        echo "</deploy-output>"
        exit 1
    fi
    if ! yarn workspace mission-control-frontend build 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>Failed to build mission control frontend</error>"
        echo "</deploy-output>"
        exit 1
    fi

    # Deploy Mission Control infrastructure
    cd "$REPO_ROOT/deployment/mission-control" || exit 1

    # Create terraform.tfvars
    echo "project_name = \"$PROJECT_NAME\"" > terraform.tfvars

    # Initialize and apply
    echo "Deploying Mission Control infrastructure..."
    terraform init -input=false 2>&1
    if ! terraform apply -auto-approve -input=false 2>&1; then
        echo "<deploy-output>"
        echo "<status>failed</status>"
        echo "<error>Failed to deploy Mission Control</error>"
        echo "</deploy-output>"
        exit 1
    fi

    # Extract outputs
    MC_URL=$(terraform output -raw mission_control_url 2>/dev/null || echo "UNAVAILABLE")
    MC_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null)

    # Create admin user in Cognito
    if [ -n "$MC_USER_POOL_ID" ]; then
        echo "Creating admin user in Cognito..."
        aws cognito-idp admin-create-user \
            --user-pool-id "$MC_USER_POOL_ID" \
            --username admin \
            --temporary-password "Slumbers99!" \
            --message-action SUPPRESS 2>&1 || echo "Note: Admin user may already exist"

        # Set permanent password
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$MC_USER_POOL_ID" \
            --username admin \
            --password "Slumbers99!" \
            --permanent 2>&1 || echo "Note: Password may already be set"
    fi

    # Upload config.json to MC S3 bucket
    MC_API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
    MC_S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
    MC_COGNITO_DOMAIN=$(terraform output -raw cognito_domain 2>/dev/null || echo "")
    MC_CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
    MC_CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

    if [ -n "$MC_S3_BUCKET" ] && [ -n "$MC_API_URL" ]; then
        echo "Uploading Mission Control config.json..."
        MC_CONFIG_JSON=$(mktemp /tmp/mc-config-XXXXXX.json)
        MC_REDIRECT_URI="https://$(echo "$MC_URL" | sed 's|https://||')/admin/callback"
        printf '{"apiUrl":"%s","cognitoDomain":"%s","clientId":"%s","userPoolId":"%s","redirectUri":"%s"}' \
            "$MC_API_URL" "$MC_COGNITO_DOMAIN" "$MC_CLIENT_ID" "$MC_USER_POOL_ID" "$MC_REDIRECT_URI" > "$MC_CONFIG_JSON"
        aws s3 cp "$MC_CONFIG_JSON" "s3://$MC_S3_BUCKET/config.json" \
            --content-type "application/json" \
            --cache-control "no-cache, no-store, must-revalidate" 2>&1 || echo "WARNING: Failed to upload MC config.json"
        rm -f "$MC_CONFIG_JSON"
    fi

    # Invalidate MC CloudFront cache
    if [ -n "$MC_CF_DIST_ID" ]; then
        echo "Invalidating Mission Control CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id "$MC_CF_DIST_ID" --paths "/*" 2>&1 || true
    fi

    echo ""
    echo "========================================="
    echo "  Mission Control Deployed!"
    echo "========================================="
    echo "  URL: $MC_URL"
    echo "  Username: admin"
    echo "  Password: Slumbers99!"
    echo "========================================="
    echo ""
else
    echo "Mission Control already exists, updating frontend..."
    cd "$REPO_ROOT/deployment/mission-control" || exit 1
    MC_URL=$(terraform output -raw mission_control_url 2>/dev/null || echo "UNAVAILABLE")

    # Rebuild and redeploy MC frontend
    cd "$REPO_ROOT" || exit 1
    yarn workspace mission-control-frontend build 2>&1 || echo "WARNING: MC frontend build failed"

    cd "$REPO_ROOT/deployment/mission-control" || exit 1
    terraform apply -auto-approve -input=false 2>&1 || echo "WARNING: MC terraform apply failed"

    # Upload config.json
    MC_API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
    MC_S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
    MC_COGNITO_DOMAIN=$(terraform output -raw cognito_domain 2>/dev/null || echo "")
    MC_CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
    MC_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
    MC_CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

    if [ -n "$MC_S3_BUCKET" ] && [ -n "$MC_API_URL" ]; then
        echo "Uploading Mission Control config.json..."
        MC_CONFIG_JSON=$(mktemp /tmp/mc-config-XXXXXX.json)
        MC_REDIRECT_URI="https://$(echo "$MC_URL" | sed 's|https://||')/admin/callback"
        printf '{"apiUrl":"%s","cognitoDomain":"%s","clientId":"%s","userPoolId":"%s","redirectUri":"%s"}' \
            "$MC_API_URL" "$MC_COGNITO_DOMAIN" "$MC_CLIENT_ID" "$MC_USER_POOL_ID" "$MC_REDIRECT_URI" > "$MC_CONFIG_JSON"
        aws s3 cp "$MC_CONFIG_JSON" "s3://$MC_S3_BUCKET/config.json" \
            --content-type "application/json" \
            --cache-control "no-cache, no-store, must-revalidate" 2>&1 || echo "WARNING: Failed to upload MC config.json"
        rm -f "$MC_CONFIG_JSON"
    fi

    # Invalidate MC CloudFront cache
    if [ -n "$MC_CF_DIST_ID" ]; then
        echo "Invalidating Mission Control CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id "$MC_CF_DIST_ID" --paths "/*" 2>&1 || true
    fi

    echo "Mission Control URL: $MC_URL"
    echo ""
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

MCP_URL="${API_URL}/mcp"

echo "========================================="
echo "  Deployment Successful!"
echo "========================================="
echo ""
echo "  Frontend URL: $FRONTEND_URL"
echo "  Backend API URL: $API_URL"
echo "  MCP Endpoint: $MCP_URL"
echo ""
echo "  MCP Connection Config (for Claude Desktop, Cursor, etc.):"
echo "    {"
echo "      \"mcpServers\": {"
echo "        \"fullstack-template\": {"
echo "          \"type\": \"streamable-http\","
echo "          \"url\": \"$MCP_URL\""
echo "        }"
echo "      }"
echo "    }"
echo ""
if [ -n "$MC_URL" ] && [ "$MC_URL" != "UNAVAILABLE" ]; then
    echo "  Mission Control: $MC_URL"
    echo ""
fi
echo "<deploy-output>"
echo "<status>success</status>"
echo "<frontend-url>$FRONTEND_URL</frontend-url>"
echo "<api-url>$API_URL</api-url>"
echo "<mcp-url>$MCP_URL</mcp-url>"
if [ -n "$MC_URL" ] && [ "$MC_URL" != "UNAVAILABLE" ]; then
    echo "<mission-control-url>$MC_URL</mission-control-url>"
fi
echo "<llm-instruction>"
echo "IMPORTANT: You MUST include these deployment URLs in your response to the user."
echo "Report that the deployment was successful and provide:"
echo "  - Frontend URL: $FRONTEND_URL"
echo "  - Backend API URL: $API_URL"
echo "  - MCP Endpoint: $MCP_URL (POST, JSON-RPC 2.0, stateless StreamableHTTP)"
echo "  - MCP connection config for Claude Desktop / Cursor / etc.:"
echo "    {\"mcpServers\":{\"fullstack-template\":{\"type\":\"streamable-http\",\"url\":\"$MCP_URL\"}}}"
if [ -n "$MC_URL" ] && [ "$MC_URL" != "UNAVAILABLE" ]; then
    echo "  - Mission Control: $MC_URL"
    echo "If this was the FIRST deployment with Mission Control, emphasize the Mission Control URL and credentials (admin / Slumbers99!)."
fi
echo "</llm-instruction>"
echo "</deploy-output>"
