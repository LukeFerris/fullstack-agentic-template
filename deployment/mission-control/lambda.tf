# --- Lambda deployment packages ---

data "archive_file" "admin_api_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../packages/admin-backend/dist"
  output_path = "${path.module}/admin-lambda.zip"
  excludes    = ["*.test.js", "*.test.d.ts"]
}

data "archive_file" "authorizer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../packages/admin-backend/dist"
  output_path = "${path.module}/authorizer-lambda.zip"
  excludes    = ["*.test.js", "*.test.d.ts"]
}

# --- IAM Role for Admin API Lambda ---

data "aws_iam_policy_document" "admin_api_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "admin_api_exec" {
  name               = "${local.resource_prefix}-admin-api-role"
  assume_role_policy = data.aws_iam_policy_document.admin_api_assume_role.json
}

resource "aws_iam_role_policy_attachment" "admin_api_basic_execution" {
  role       = aws_iam_role.admin_api_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- IAM Policy for Resource Discovery and Deletion ---

data "aws_iam_policy_document" "admin_api_permissions" {
  # Resource Groups Tagging API for environment discovery
  statement {
    effect = "Allow"
    actions = [
      "tag:GetResources",
      "tag:GetTagKeys",
      "tag:GetTagValues"
    ]
    resources = ["*"]
  }

  # CloudFront permissions
  statement {
    effect = "Allow"
    actions = [
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:ListDistributions",
      "cloudfront:UpdateDistribution",
      "cloudfront:DeleteDistribution"
    ]
    resources = ["*"]
  }

  # S3 permissions
  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:DeleteBucket",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:ListBucketVersions"
    ]
    resources = ["*"]
  }

  # Lambda permissions
  statement {
    effect = "Allow"
    actions = [
      "lambda:GetFunction",
      "lambda:DeleteFunction",
      "lambda:ListFunctions"
    ]
    resources = ["*"]
  }

  # API Gateway permissions
  statement {
    effect = "Allow"
    actions = [
      "apigateway:GET",
      "apigateway:DELETE"
    ]
    resources = ["*"]
  }

  # IAM permissions
  statement {
    effect = "Allow"
    actions = [
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:GetPolicy",
      "iam:DeletePolicy"
    ]
    resources = ["*"]
  }

  # CloudWatch Logs permissions
  statement {
    effect = "Allow"
    actions = [
      "logs:DeleteLogGroup",
      "logs:DescribeLogGroups"
    ]
    resources = ["*"]
  }

  # SSM Parameter Store permissions
  statement {
    effect = "Allow"
    actions = [
      "ssm:DeleteParameter",
      "ssm:DeleteParameters",
      "ssm:GetParameter"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "admin_api_permissions" {
  name   = "${local.resource_prefix}-admin-api-permissions"
  policy = data.aws_iam_policy_document.admin_api_permissions.json
}

resource "aws_iam_role_policy_attachment" "admin_api_permissions" {
  role       = aws_iam_role.admin_api_exec.name
  policy_arn = aws_iam_policy.admin_api_permissions.arn
}

# --- CloudWatch Log Group for Admin API ---

resource "aws_cloudwatch_log_group" "admin_api_logs" {
  name              = "/aws/lambda/${local.resource_prefix}-admin-api"
  retention_in_days = 14
}

# --- Admin API Lambda Function ---

resource "aws_lambda_function" "admin_api" {
  function_name    = "${local.resource_prefix}-admin-api"
  role             = aws_iam_role.admin_api_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 512
  timeout          = 300  # 5 minutes for environment deletion
  filename         = data.archive_file.admin_api_zip.output_path
  source_code_hash = data.archive_file.admin_api_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME = var.project_name
      AWS_REGION_OVERRIDE = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.admin_api_basic_execution,
    aws_iam_role_policy_attachment.admin_api_permissions,
    aws_cloudwatch_log_group.admin_api_logs,
  ]
}

# --- IAM Role for Lambda Authorizer ---

resource "aws_iam_role" "authorizer_exec" {
  name               = "${local.resource_prefix}-authorizer-role"
  assume_role_policy = data.aws_iam_policy_document.admin_api_assume_role.json
}

resource "aws_iam_role_policy_attachment" "authorizer_basic_execution" {
  role       = aws_iam_role.authorizer_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- IAM Policy for Cognito Access ---

data "aws_iam_policy_document" "authorizer_cognito" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:GetUser"
    ]
    resources = [aws_cognito_user_pool.mission_control.arn]
  }
}

resource "aws_iam_policy" "authorizer_cognito" {
  name   = "${local.resource_prefix}-authorizer-cognito"
  policy = data.aws_iam_policy_document.authorizer_cognito.json
}

resource "aws_iam_role_policy_attachment" "authorizer_cognito" {
  role       = aws_iam_role.authorizer_exec.name
  policy_arn = aws_iam_policy.authorizer_cognito.arn
}

# --- CloudWatch Log Group for Authorizer ---

resource "aws_cloudwatch_log_group" "authorizer_logs" {
  name              = "/aws/lambda/${local.resource_prefix}-authorizer"
  retention_in_days = 14
}

# --- Lambda Authorizer Function ---

resource "aws_lambda_function" "authorizer" {
  function_name    = "${local.resource_prefix}-authorizer"
  role             = aws_iam_role.authorizer_exec.arn
  handler          = "authorizer.handler"
  runtime          = "nodejs20.x"
  memory_size      = 128
  timeout          = 10
  filename         = data.archive_file.authorizer_zip.output_path
  source_code_hash = data.archive_file.authorizer_zip.output_base64sha256

  environment {
    variables = {
      USER_POOL_ID = aws_cognito_user_pool.mission_control.id
      CLIENT_ID    = aws_cognito_user_pool_client.admin.id
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.authorizer_basic_execution,
    aws_iam_role_policy_attachment.authorizer_cognito,
    aws_cloudwatch_log_group.authorizer_logs,
  ]
}

# --- Lambda Permission for API Gateway to invoke Authorizer ---

resource "aws_lambda_permission" "authorizer_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.mission_control.execution_arn}/*/*"
}

# --- Lambda Permission for API Gateway to invoke Admin API ---

resource "aws_lambda_permission" "admin_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.mission_control.execution_arn}/*/*"
}
