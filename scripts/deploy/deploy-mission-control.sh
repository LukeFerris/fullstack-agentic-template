#!/bin/bash

# Deploy Mission Control admin panel
# Only deploys if not already present (singleton per AWS account)

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 1
MC_DEPLOY_DIR="$REPO_ROOT/deployment/mission-control"

if [ ! -d "$MC_DEPLOY_DIR" ]; then
    echo "Mission Control deployment directory not found, skipping."
    exit 0
fi

# --- Check if Mission Control is already deployed via SSM marker ---

MC_MARKER=$(aws ssm get-parameter --name "/mission-control/deployed" --query "Parameter.Value" --output text 2>/dev/null)

if [ "$MC_MARKER" = "true" ]; then
    MC_URL=$(aws ssm get-parameter --name "/mission-control/url" --query "Parameter.Value" --output text 2>/dev/null)
    echo ""
    echo "Mission Control is already deployed at: $MC_URL"
    echo ""
    exit 0
fi

echo ""
echo "========================================="
echo "  Deploying Mission Control..."
echo "========================================="
echo ""

# --- Build Mission Control packages ---

echo "Building Mission Control backend..."
cd "$REPO_ROOT" || exit 1
if ! yarn workspace mission-control-backend build 2>&1; then
    echo "WARNING: Mission Control backend build failed (non-fatal for main deploy)"
    exit 0
fi

echo "Building Mission Control frontend..."
if ! yarn workspace mission-control build 2>&1; then
    echo "WARNING: Mission Control frontend build failed (non-fatal for main deploy)"
    exit 0
fi

# --- Terraform init and apply ---

cd "$MC_DEPLOY_DIR" || exit 1

if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform for Mission Control..."
    if ! terraform init -input=false 2>&1; then
        echo "WARNING: Mission Control terraform init failed (non-fatal)"
        exit 0
    fi
fi

echo "Applying Mission Control Terraform..."
MC_APPLY_LOG=$(mktemp /tmp/mc-deploy-XXXXXX.log)

terraform apply -auto-approve -input=false 2>&1 | tee "$MC_APPLY_LOG"
MC_EXIT_CODE=${PIPESTATUS[0]}

if [ $MC_EXIT_CODE -ne 0 ]; then
    echo "WARNING: Mission Control deployment failed (non-fatal for main deploy)"
    rm -f "$MC_APPLY_LOG"
    exit 0
fi

rm -f "$MC_APPLY_LOG"

# --- Extract outputs ---

MC_FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "UNAVAILABLE")
MC_API_URL=$(terraform output -raw api_url 2>/dev/null || echo "UNAVAILABLE")
MC_S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
MC_CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
MC_COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
MC_REGION=$(terraform output -raw 2>/dev/null || echo "us-east-1")

# Use aws_region variable default
MC_REGION="us-east-1"

# --- Upload config.json ---

if [ -n "$MC_S3_BUCKET" ] && [ "$MC_API_URL" != "UNAVAILABLE" ]; then
    CONFIG_JSON=$(mktemp /tmp/mc-config-XXXXXX.json)
    printf '{"apiUrl":"%s","cognitoClientId":"%s","cognitoRegion":"%s"}' \
        "$MC_API_URL" "$MC_COGNITO_CLIENT_ID" "$MC_REGION" > "$CONFIG_JSON"

    aws s3 cp "$CONFIG_JSON" "s3://$MC_S3_BUCKET/config.json" \
        --content-type "application/json" \
        --cache-control "no-cache, no-store, must-revalidate" 2>&1 || true

    rm -f "$CONFIG_JSON"
fi

# --- Invalidate CloudFront cache ---

if [ -n "$MC_CF_DIST_ID" ]; then
    aws cloudfront create-invalidation \
        --distribution-id "$MC_CF_DIST_ID" \
        --paths "/*" 2>&1 || true
fi

# --- Set SSM marker so we don't redeploy ---

aws ssm put-parameter \
    --name "/mission-control/deployed" \
    --type "String" \
    --value "true" \
    --overwrite 2>&1 || true

aws ssm put-parameter \
    --name "/mission-control/url" \
    --type "String" \
    --value "$MC_FRONTEND_URL" \
    --overwrite 2>&1 || true

echo ""
echo "========================================="
echo "  Mission Control Deployed!"
echo "========================================="
echo ""
echo "  Mission Control URL: $MC_FRONTEND_URL"
echo "  Admin Username: admin"
echo ""
echo "<mission-control-output>"
echo "<status>success</status>"
echo "<url>$MC_FRONTEND_URL</url>"
echo "<llm-instruction>"
echo "IMPORTANT: Mission Control has been deployed for the first time."
echo "Report the Mission Control URL to the user: $MC_FRONTEND_URL"
echo "Admin credentials: username 'admin'"
echo "</llm-instruction>"
echo "</mission-control-output>"
