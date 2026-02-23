output "mission_control_url" {
  description = "Mission Control frontend URL"
  value       = "https://${aws_cloudfront_distribution.admin.domain_name}"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID for authentication"
  value       = aws_cognito_user_pool.mission_control.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.admin.id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = "${aws_cognito_user_pool_domain.mission_control.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "api_url" {
  description = "Mission Control API Gateway URL"
  value       = aws_api_gateway_stage.prod.invoke_url
}

output "s3_bucket_name" {
  description = "S3 bucket for admin frontend assets"
  value       = aws_s3_bucket.admin_frontend.id
}
