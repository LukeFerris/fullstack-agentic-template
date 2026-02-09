# --- SSM Parameter Store for runtime configuration ---

resource "aws_ssm_parameter" "api_url" {
  name        = "/${local.resource_prefix}/api-url"
  description = "API Gateway URL for ${local.resource_prefix}"
  type        = "String"
  value       = aws_api_gateway_stage.prod.invoke_url
}
