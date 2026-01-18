#!/bin/bash
# Agent-Merge CLI Installation Script
# Usage: curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash

set -e

REPO="antonstjernquist/merge"
INSTALL_DIR="${HOME}/.merge"
BIN_DIR="${HOME}/.local/bin"
CLI_NAME="agent-merge"

echo "Installing Agent-Merge CLI..."

# Check for required tools
command -v git >/dev/null 2>&1 || { echo "Error: git is required"; exit 1; }

# Detect package manager and runtime
# Note: This project uses nx which has compatibility issues with bun
# So we use pnpm/npm for install+build, but can use bun for runtime
if command -v bun >/dev/null 2>&1; then
    RUNTIME="bun"
else
    RUNTIME="node"
fi

if command -v pnpm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
    PKG_MANAGER="pnpm"
    echo "Using pnpm (runtime: ${RUNTIME})..."
elif command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
    PKG_MANAGER="npm"
    echo "Using npm (runtime: ${RUNTIME})..."
else
    echo "Error: node with pnpm or npm is required"
    exit 1
fi

# Create directories
mkdir -p "${INSTALL_DIR}"
mkdir -p "${BIN_DIR}"

# Clone or update repo
if [ -d "${INSTALL_DIR}/src" ]; then
    echo "Updating existing installation..."
    cd "${INSTALL_DIR}/src"
    git pull --quiet
else
    echo "Cloning repository..."
    git clone --quiet "https://github.com/${REPO}.git" "${INSTALL_DIR}/src"
    cd "${INSTALL_DIR}/src"
fi

# Install dependencies and build
echo "Installing dependencies..."
$PKG_MANAGER install --silent 2>/dev/null || $PKG_MANAGER install

echo "Building..."
# Note: Don't use --silent with nx as it passes through to tsc which doesn't support it
$PKG_MANAGER run build

# Create wrapper script with detected runtime
cat > "${BIN_DIR}/${CLI_NAME}" << WRAPPER
#!/bin/bash
${RUNTIME} "\${HOME}/.merge/src/packages/cli/bin/agent-merge.js" "\$@"
WRAPPER
chmod +x "${BIN_DIR}/${CLI_NAME}"

# Detect shell and profile file
detect_shell_profile() {
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "$(which zsh)" ] || [ -f "${HOME}/.zshrc" ]; then
        echo "${HOME}/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "$(which bash)" ]; then
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
PATH_EXPORT="export PATH=\"\${HOME}/.local/bin:\${PATH}\""

if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
    PROFILE_FILE=$(detect_shell_profile)

    # Check if already in profile
    if ! grep -q ".local/bin" "${PROFILE_FILE}" 2>/dev/null; then
        echo "" >> "${PROFILE_FILE}"
        echo "# Added by agent-merge installer" >> "${PROFILE_FILE}"
        echo "${PATH_EXPORT}" >> "${PROFILE_FILE}"
        echo "Added PATH to ${PROFILE_FILE}"
        echo ""
        echo "Run this to use immediately: source ${PROFILE_FILE}"
    fi
fi

echo ""
echo "Agent-Merge CLI installed successfully!"
echo ""
echo "Quick start:"
echo "  ${CLI_NAME} connect --token YOUR_TOKEN --name \"Agent Name\" --server https://merge.kresis.ai"
echo "  ${CLI_NAME} status"
echo "  ${CLI_NAME} poll"
echo ""
