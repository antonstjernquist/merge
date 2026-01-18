#!/bin/bash
# Agent-Merge CLI Installation Script
# Usage: curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash

set -e

CDN_URL="https://cdn.kresis.ai/merge/bin"
BIN_DIR="${HOME}/.local/bin"
CLI_NAME="agent-merge"

echo "Installing Agent-Merge CLI..."

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
    linux)  OS="linux" ;;
    darwin) OS="darwin" ;;
    mingw*|msys*|cygwin*) OS="windows" ;;
    *) echo "Error: Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
    x86_64|amd64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo "Error: Unsupported architecture: $ARCH"; exit 1 ;;
esac

BINARY_NAME="${CLI_NAME}-${OS}-${ARCH}"
if [ "$OS" = "windows" ]; then
    BINARY_NAME="${BINARY_NAME}.exe"
fi

echo "Detected: ${OS}-${ARCH}"
echo "Downloading ${BINARY_NAME}..."

# Create bin directory
mkdir -p "${BIN_DIR}"

# Download binary
DOWNLOAD_URL="${CDN_URL}/${BINARY_NAME}"
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "${DOWNLOAD_URL}" -o "${BIN_DIR}/${CLI_NAME}"
elif command -v wget >/dev/null 2>&1; then
    wget -q "${DOWNLOAD_URL}" -O "${BIN_DIR}/${CLI_NAME}"
else
    echo "Error: curl or wget is required"
    exit 1
fi

# Make executable
chmod +x "${BIN_DIR}/${CLI_NAME}"

# Detect shell and profile file
detect_shell_profile() {
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "$(which zsh 2>/dev/null)" ] || [ -f "${HOME}/.zshrc" ]; then
        echo "${HOME}/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "$(which bash 2>/dev/null)" ]; then
        if [ -f "${HOME}/.bash_profile" ]; then
            echo "${HOME}/.bash_profile"
        else
            echo "${HOME}/.bashrc"
        fi
    else
        echo "${HOME}/.profile"
    fi
}

# Add to PATH if needed
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
    PROFILE_FILE=$(detect_shell_profile)
    PATH_EXPORT='export PATH="${HOME}/.local/bin:${PATH}"'

    if ! grep -q ".local/bin" "${PROFILE_FILE}" 2>/dev/null; then
        echo "" >> "${PROFILE_FILE}"
        echo "# Added by agent-merge installer" >> "${PROFILE_FILE}"
        echo "${PATH_EXPORT}" >> "${PROFILE_FILE}"
        echo "Added PATH to ${PROFILE_FILE}"
        echo "Run: source ${PROFILE_FILE}"
    fi
fi

echo ""
echo "Agent-Merge CLI installed successfully!"
echo ""
echo "Quick start:"
echo "  ${CLI_NAME} join my-room --name \"Agent\" --role worker --skills testing --server https://your-server:3000"
echo "  ${CLI_NAME} agents"
echo "  ${CLI_NAME} send \"Run tests\" --to-skill testing --blocking"
echo ""
echo "Help:"
echo "  ${CLI_NAME} --help"
echo "  ${CLI_NAME} join --help"
echo "  ${CLI_NAME} send --help"
echo ""
