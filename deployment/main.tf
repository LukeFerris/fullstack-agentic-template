terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project       = var.project_name
      Environment   = local.environment_id
      ManagedBy     = "terraform"
    }
  }
}

# --- Environment ID ---
# Generates a unique ID on first apply. Persisted to terraform.tfvars
# so subsequent applies target the same environment. Fresh clones get
# a new ID since terraform.tfvars is gitignored.

resource "random_id" "environment" {
  byte_length = 4
}

locals {
  environment_id = var.environment_id != "" ? var.environment_id : random_id.environment.hex
  resource_prefix = "${var.project_name}-${local.environment_id}"
}

resource "terraform_data" "persist_env_id" {
  triggers_replace = [local.environment_id]

  provisioner "local-exec" {
    command = <<-EOT
      if ! grep -q 'environment_id' "${path.module}/terraform.tfvars" 2>/dev/null; then
        echo 'environment_id = "${local.environment_id}"' >> "${path.module}/terraform.tfvars"
      fi
    EOT
  }
}
