variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "admin_username" {
  description = "Admin username for Cognito"
  type        = string
  default     = "admin"
}

variable "admin_password" {
  description = "Admin password for Cognito"
  type        = string
  default     = "Slumbers99!"
  sensitive   = true
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 60
}
