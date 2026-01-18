#!/bin/bash
# Merge CLI Installation Script
# Usage: curl -fsSL https://cdn.kresis.ai/merge/install.sh | bash

set -e

REPO="antonstjernquist/merge"
INSTALL_DIR="${HOME}/.merge"
BIN_DIR="${HOME}/.local/bin"

echo "Installing Merge CLI..."

# Check for required tools
command -v git >/dev/null 2>&1 || { echo "Error: git is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: node is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Install with: npm install -g pnpm"; exit 1; }

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
pnpm install --silent

echo "Building..."
pnpm build --silent

# Create wrapper script
cat > "${BIN_DIR}/merge" << 'WRAPPER'
#!/bin/bash
node "${HOME}/.merge/src/packages/cli/bin/merge.js" "$@"
WRAPPER
chmod +x "${BIN_DIR}/merge"

# Add to PATH if needed
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
    echo ""
    echo "Add this to your shell profile (~/.bashrc or ~/.zshrc):"
    echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
    echo ""
fi

echo "Merge CLI installed successfully!"
echo ""
echo "Quick start:"
echo "  merge connect --token YOUR_TOKEN --name \"Agent Name\" --server https://merge.kresis.ai"
echo "  merge status"
echo "  merge poll"
