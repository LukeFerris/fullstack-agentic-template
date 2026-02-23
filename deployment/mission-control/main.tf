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
  }

  backend "local" {
    path = "mission-control.tfstate"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project          = var.project_name
      IsMissionControl = "true"
      ManagedBy        = "terraform"
    }
  }
}

locals {
  resource_prefix = "${var.project_name}-mc"
}
