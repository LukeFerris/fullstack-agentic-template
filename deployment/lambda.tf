# --- Lambda deployment package ---
# Zips the compiled backend. Run `yarn build` before `terraform apply`.

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../packages/backend/dist/index.js"
  output_path = "${path.module}/lambda_payload.zip"
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

# --- IAM Policy for SSM Parameter Read Access ---

data "aws_iam_policy_document" "lambda_ssm_read" {
  statement {
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:*:parameter/${local.resource_prefix}/*"
    ]
  }
}

resource "aws_iam_policy" "lambda_ssm_read" {
  name   = "${local.resource_prefix}-lambda-ssm-read"
  policy = data.aws_iam_policy_document.lambda_ssm_read.json
}

resource "aws_iam_role_policy_attachment" "lambda_ssm_read" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_ssm_read.arn
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
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      SSM_PARAMETER_PREFIX = "/${local.resource_prefix}"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_ssm_read,
    aws_cloudwatch_log_group.lambda_logs,
  ]
}
