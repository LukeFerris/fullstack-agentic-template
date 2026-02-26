# --- REST API ---

resource "aws_api_gateway_rest_api" "mission_control" {
  name        = "${local.resource_prefix}-api"
  description = "Mission Control API for environment management"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# --- Lambda Authorizer ---

resource "aws_api_gateway_authorizer" "cognito" {
  name                             = "${local.resource_prefix}-authorizer"
  rest_api_id                      = aws_api_gateway_rest_api.mission_control.id
  type                             = "REQUEST"
  authorizer_uri                   = aws_lambda_function.authorizer.invoke_arn
  identity_source                  = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 300
}

# --- /admin resource ---

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  parent_id   = aws_api_gateway_rest_api.mission_control.root_resource_id
  path_part   = "admin"
}

# --- /admin/environments resource ---

resource "aws_api_gateway_resource" "environments" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "environments"
}

# --- GET /admin/environments (list environments) ---

resource "aws_api_gateway_method" "list_environments" {
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  resource_id   = aws_api_gateway_resource.environments.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "list_environments" {
  rest_api_id             = aws_api_gateway_rest_api.mission_control.id
  resource_id             = aws_api_gateway_resource.environments.id
  http_method             = aws_api_gateway_method.list_environments.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin_api.invoke_arn
}

# --- /admin/environments/{id} resource ---

resource "aws_api_gateway_resource" "environment_id" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  parent_id   = aws_api_gateway_resource.environments.id
  path_part   = "{id}"
}

# --- DELETE /admin/environments/{id} (delete environment) ---

resource "aws_api_gateway_method" "delete_environment" {
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  resource_id   = aws_api_gateway_resource.environment_id.id
  http_method   = "DELETE"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.id" = true
  }
}

resource "aws_api_gateway_integration" "delete_environment" {
  rest_api_id             = aws_api_gateway_rest_api.mission_control.id
  resource_id             = aws_api_gateway_resource.environment_id.id
  http_method             = aws_api_gateway_method.delete_environment.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin_api.invoke_arn
}

# --- OPTIONS method for CORS (on /admin/environments) ---

resource "aws_api_gateway_method" "environments_options" {
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  resource_id   = aws_api_gateway_resource.environments.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "environments_options" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  resource_id = aws_api_gateway_resource.environments.id
  http_method = aws_api_gateway_method.environments_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "environments_options" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  resource_id = aws_api_gateway_resource.environments.id
  http_method = aws_api_gateway_method.environments_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "environments_options" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  resource_id = aws_api_gateway_resource.environments.id
  http_method = aws_api_gateway_method.environments_options.http_method
  status_code = aws_api_gateway_method_response.environments_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# --- OPTIONS method for CORS (on /admin/environments/{id}) ---

resource "aws_api_gateway_method" "environment_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  resource_id   = aws_api_gateway_resource.environment_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "environment_id_options" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  resource_id = aws_api_gateway_resource.environment_id.id
  http_method = aws_api_gateway_method.environment_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "environment_id_options" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  resource_id = aws_api_gateway_resource.environment_id.id
  http_method = aws_api_gateway_method.environment_id_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "environment_id_options" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id
  resource_id = aws_api_gateway_resource.environment_id.id
  http_method = aws_api_gateway_method.environment_id_options.http_method
  status_code = aws_api_gateway_method_response.environment_id_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# --- Gateway Responses (CORS headers on API Gateway error responses) ---

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,DELETE,OPTIONS'"
  }
}

# --- Deployment and Stage ---

resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.mission_control.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.admin.id,
      aws_api_gateway_resource.environments.id,
      aws_api_gateway_resource.environment_id.id,
      aws_api_gateway_method.list_environments.id,
      aws_api_gateway_integration.list_environments.id,
      aws_api_gateway_method.delete_environment.id,
      aws_api_gateway_integration.delete_environment.id,
      aws_api_gateway_authorizer.cognito.authorizer_uri,
      aws_api_gateway_gateway_response.default_4xx.id,
      aws_api_gateway_gateway_response.default_5xx.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.mission_control.id
  stage_name    = "prod"
}
