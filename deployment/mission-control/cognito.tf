# --- Cognito User Pool ---

resource "aws_cognito_user_pool" "mission_control" {
  name = "mission-control-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

resource "aws_cognito_user_pool_client" "mission_control" {
  name         = "mission-control-client"
  user_pool_id = aws_cognito_user_pool.mission_control.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]
}

# --- Create admin user with permanent password ---

resource "terraform_data" "admin_user" {
  triggers_replace = [aws_cognito_user_pool.mission_control.id]

  provisioner "local-exec" {
    command = <<-EOT
      aws cognito-idp admin-create-user \
        --user-pool-id ${aws_cognito_user_pool.mission_control.id} \
        --username ${var.admin_username} \
        --message-action SUPPRESS \
        --region ${var.aws_region} 2>/dev/null || true

      aws cognito-idp admin-set-user-password \
        --user-pool-id ${aws_cognito_user_pool.mission_control.id} \
        --username ${var.admin_username} \
        --password "${var.admin_password}" \
        --permanent \
        --region ${var.aws_region}
    EOT
  }
}
