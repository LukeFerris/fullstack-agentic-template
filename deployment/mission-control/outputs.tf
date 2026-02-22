output "frontend_url" {
  description = "Mission Control frontend URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_url" {
  description = "Mission Control API URL"
  value       = aws_api_gateway_stage.prod.invoke_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for Mission Control frontend"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for Mission Control"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.mission_control.id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = aws_cognito_user_pool_client.mission_control.id
}
