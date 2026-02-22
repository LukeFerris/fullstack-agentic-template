# --- Lambda deployment package ---

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../packages/mission-control-backend/dist"
  output_path = "${path.module}/mc_lambda_payload.zip"
}

# --- IAM Role for Lambda ---

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${local.resource_prefix}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- IAM Policy for environment management ---

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "lambda_env_management" {
  statement {
    sid    = "SSMAccess"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
      "ssm:DeleteParameter",
      "ssm:PutParameter",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/mission-control/*",
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/*-*/*",
    ]
  }

  statement {
    sid    = "S3Access"
    effect = "Allow"
    actions = [
      "s3:ListAllMyBuckets",
      "s3:ListBucket",
      "s3:DeleteObject",
      "s3:DeleteBucket",
      "s3:GetObject",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "CloudFrontAccess"
    effect = "Allow"
    actions = [
      "cloudfront:ListDistributions",
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:UpdateDistribution",
      "cloudfront:DeleteDistribution",
      "cloudfront:ListOriginAccessControls",
      "cloudfront:GetOriginAccessControl",
      "cloudfront:DeleteOriginAccessControl",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "LambdaAccess"
    effect = "Allow"
    actions = [
      "lambda:DeleteFunction",
    ]
    resources = [
      "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:*-*-api",
    ]
  }

  statement {
    sid    = "APIGatewayAccess"
    effect = "Allow"
    actions = [
      "apigateway:GET",
      "apigateway:DELETE",
    ]
    resources = [
      "arn:aws:apigateway:${var.aws_region}::/restapis",
      "arn:aws:apigateway:${var.aws_region}::/restapis/*",
    ]
  }

  statement {
    sid    = "IAMAccess"
    effect = "Allow"
    actions = [
      "iam:ListAttachedRolePolicies",
      "iam:DetachRolePolicy",
      "iam:ListRolePolicies",
      "iam:DeleteRolePolicy",
      "iam:DeleteRole",
      "iam:ListPolicies",
      "iam:DeletePolicy",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "CloudWatchLogsAccess"
    effect = "Allow"
    actions = [
      "logs:DeleteLogGroup",
    ]
    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/*-*-api:*",
    ]
  }
}

resource "aws_iam_policy" "lambda_env_management" {
  name   = "${local.resource_prefix}-lambda-env-mgmt"
  policy = data.aws_iam_policy_document.lambda_env_management.json
}

resource "aws_iam_role_policy_attachment" "lambda_env_management" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_env_management.arn
}

# --- CloudWatch Log Group ---

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.resource_prefix}-api"
  retention_in_days = 14
}

# --- Lambda Function ---

resource "aws_lambda_function" "api" {
  function_name    = "${local.resource_prefix}-api"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  memory_size      = 256
  timeout          = var.lambda_timeout
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_env_management,
    aws_cloudwatch_log_group.lambda_logs,
  ]
}
