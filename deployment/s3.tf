# --- S3 Bucket for Frontend ---

resource "aws_s3_bucket" "frontend" {
  bucket_prefix = "${local.resource_prefix}-frontend-"
  force_destroy = true
}

# --- Block all public access ---

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- Bucket policy: allow CloudFront OAC only ---

data "aws_iam_policy_document" "frontend_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket_policy.json
}

# --- Upload frontend build artifacts ---

locals {
  frontend_dist_path = "${path.module}/../packages/frontend/dist"

  mime_types = {
    ".html"  = "text/html"
    ".css"   = "text/css"
    ".js"    = "application/javascript"
    ".json"  = "application/json"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".gif"   = "image/gif"
    ".svg"   = "image/svg+xml"
    ".ico"   = "image/x-icon"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
    ".txt"   = "text/plain"
    ".map"   = "application/json"
  }
}

resource "aws_s3_object" "frontend_files" {
  for_each = fileset(local.frontend_dist_path, "**/*")

  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "${local.frontend_dist_path}/${each.value}"
  etag         = filemd5("${local.frontend_dist_path}/${each.value}")
  content_type = lookup(local.mime_types, regex("\\.[^.]+$", each.value), "application/octet-stream")
}
