# Cognito User Pool for Mission Control authentication
resource "aws_cognito_user_pool" "mission_control" {
  name = "${local.resource_prefix}-users"

  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  auto_verified_attributes = []
  mfa_configuration        = "OFF"

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  lifecycle {
    ignore_changes = [schema]
  }
}

# Cognito User Pool Client for the admin frontend
resource "aws_cognito_user_pool_client" "admin" {
  name         = "${local.resource_prefix}-client"
  user_pool_id = aws_cognito_user_pool.mission_control.id

  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["implicit"]
  allowed_oauth_scopes                 = ["openid", "profile"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = [
    "http://localhost:5173/admin/callback",  # Local development
    "https://${aws_cloudfront_distribution.admin.domain_name}/admin/callback"
  ]

  logout_urls = [
    "http://localhost:5173",
    "https://${aws_cloudfront_distribution.admin.domain_name}"
  ]

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Cognito User Pool Domain for hosted UI
resource "aws_cognito_user_pool_domain" "mission_control" {
  domain       = "${local.resource_prefix}-${substr(md5(aws_cognito_user_pool.mission_control.id), 0, 8)}"
  user_pool_id = aws_cognito_user_pool.mission_control.id
}

# Admin user - created via AWS CLI after Terraform apply
# This is done in the deploy script to work around Terraform limitations
# with user creation and password setting
