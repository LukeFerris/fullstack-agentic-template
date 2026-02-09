#!/bin/bash

echo "========================================="
echo "Installing Infrastructure Tools"
echo "========================================="
echo ""

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "Detected OS: $OS"
echo ""

if [[ "$OS" == "unknown" ]]; then
    echo "ERROR: Unsupported operating system: $OSTYPE"
    echo "This script supports macOS and Linux only."
    exit 1
fi

# Install Terraform
install_terraform() {
    if command -v terraform &> /dev/null; then
        echo "✓ Terraform is already installed"
        terraform --version | head -1
        return 0
    fi

    echo "Installing Terraform..."

    if [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew tap hashicorp/tap
            brew install hashicorp/tap/terraform
        else
            echo "ERROR: Homebrew not found. Please install Homebrew first:"
            echo "  https://brew.sh"
            return 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        local ARCH
        case $(uname -m) in
            x86_64)  ARCH="amd64" ;;
            aarch64) ARCH="arm64" ;;
            *)       echo "ERROR: Unsupported architecture: $(uname -m)"; return 1 ;;
        esac

        local TF_VERSION="1.12.0"
        local TF_ZIP="terraform_${TF_VERSION}_linux_${ARCH}.zip"
        local TF_URL="https://releases.hashicorp.com/terraform/${TF_VERSION}/${TF_ZIP}"
        local INSTALL_DIR="/usr/local/bin"

        echo "Downloading Terraform v${TF_VERSION} for linux/${ARCH}..."
        if command -v curl &> /dev/null; then
            curl -sL "$TF_URL" -o "/tmp/${TF_ZIP}"
        elif command -v wget &> /dev/null; then
            wget -q "$TF_URL" -O "/tmp/${TF_ZIP}"
        else
            echo "ERROR: Neither curl nor wget found."
            return 1
        fi

        if [[ -f "/tmp/${TF_ZIP}" ]]; then
            if command -v unzip &> /dev/null; then
                unzip -o -q "/tmp/${TF_ZIP}" -d "$INSTALL_DIR"
            else
                echo "ERROR: unzip not found. Please install unzip first."
                rm -f "/tmp/${TF_ZIP}"
                return 1
            fi
            chmod +x "$INSTALL_DIR/terraform"
            rm -f "/tmp/${TF_ZIP}"
        else
            echo "ERROR: Failed to download Terraform."
            return 1
        fi
    fi

    if command -v terraform &> /dev/null; then
        echo "✓ Terraform installed successfully"
        terraform --version | head -1
    else
        echo "WARNING: Terraform installation may have failed. Please verify manually."
    fi
}

# Install AWS CLI v2
install_aws_cli() {
    if command -v aws &> /dev/null; then
        echo "✓ AWS CLI is already installed"
        aws --version
        return 0
    fi

    echo "Installing AWS CLI v2..."

    if [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install awscli
        else
            echo "Downloading AWS CLI installer for macOS..."
            curl -sL "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "/tmp/AWSCLIV2.pkg"
            sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
            rm -f /tmp/AWSCLIV2.pkg
        fi
    elif [[ "$OS" == "linux" ]]; then
        local ARCH
        case $(uname -m) in
            x86_64)  ARCH="x86_64" ;;
            aarch64) ARCH="aarch64" ;;
            *)       echo "ERROR: Unsupported architecture: $(uname -m)"; return 1 ;;
        esac

        echo "Downloading AWS CLI v2 for linux/${ARCH}..."
        if command -v curl &> /dev/null; then
            curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o "/tmp/awscliv2.zip"
        elif command -v wget &> /dev/null; then
            wget -q "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -O "/tmp/awscliv2.zip"
        else
            echo "ERROR: Neither curl nor wget found."
            return 1
        fi

        if [[ -f "/tmp/awscliv2.zip" ]]; then
            if command -v unzip &> /dev/null; then
                unzip -o -q "/tmp/awscliv2.zip" -d /tmp
            else
                echo "ERROR: unzip not found. Please install unzip first."
                rm -f "/tmp/awscliv2.zip"
                return 1
            fi
            /tmp/aws/install --update 2>/dev/null || /tmp/aws/install
            rm -rf /tmp/aws /tmp/awscliv2.zip
        else
            echo "ERROR: Failed to download AWS CLI."
            return 1
        fi
    fi

    if command -v aws &> /dev/null; then
        echo "✓ AWS CLI installed successfully"
        aws --version
    else
        echo "WARNING: AWS CLI installation may have failed. Please verify manually."
    fi
}

# Run installations
install_terraform
echo ""
install_aws_cli

echo ""
echo "========================================="
echo "Infrastructure Tools Installation Complete"
echo "========================================="
echo ""
echo "Installed tools:"
echo "  - Terraform (IaC)"
echo "  - AWS CLI v2 (Cloud management)"
echo ""
