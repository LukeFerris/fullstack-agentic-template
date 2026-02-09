output "project_name" {
  description = "Project name used for resource naming (auto-derived if not set)"
  value       = local.project_name
}

output "environment_id" {
  description = "Unique environment identifier for this deployment"
  value       = local.environment_id
}

output "frontend_url" {
  description = "CloudFront URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_url" {
  description = "API Gateway URL for the backend"
  value       = aws_api_gateway_stage.prod.invoke_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (useful for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "ssm_parameter_prefix" {
  description = "SSM parameter prefix for runtime configuration"
  value       = "/${local.resource_prefix}"
}
